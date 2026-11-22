-- ==============================================================================
-- AI 세컨드 브레인 (PKM & RAG 허브) Database Schema
-- ==============================================================================

-- 1. pgvector 확장 활성화
create extension if not exists vector;

-- 2. documents 테이블 (수집 및 작성된 통합 문서)
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    source_type text not null check (source_type in ('web', 'pdf', 'note')),
    source_url text,
    raw_content text not null,
    summary text,
    created_at timestamptz not null default now()
);

-- 3. document_chunks 테이블 (RAG 및 벡터 검색용 청크)
create table if not exists public.document_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    chunk_index int not null,
    page_number int,
    content text not null,
    embedding vector(1536)
);

-- 4. tags 및 document_tags 테이블 (다대다 태그 분류)
create table if not exists public.tags (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamptz not null default now()
);

create table if not exists public.document_tags (
    document_id uuid not null references public.documents(id) on delete cascade,
    tag_id uuid not null references public.tags(id) on delete cascade,
    primary key (document_id, tag_id)
);

-- 5. document_links 테이블 (지식 그래프 및 백링크)
create table if not exists public.document_links (
    id uuid primary key default gen_random_uuid(),
    source_doc_id uuid not null references public.documents(id) on delete cascade,
    target_doc_id uuid not null references public.documents(id) on delete cascade,
    similarity_score float,
    link_type text not null check (link_type in ('auto', 'manual')),
    created_at timestamptz not null default now(),
    constraint unique_doc_link unique (source_doc_id, target_doc_id),
    constraint no_self_link check (source_doc_id <> target_doc_id)
);

-- 인덱스 생성
create index if not exists idx_documents_created_at on public.documents(created_at desc);
create index if not exists idx_documents_source_type on public.documents(source_type);
create index if not exists idx_chunks_document_id on public.document_chunks(document_id);
create index if not exists idx_doc_links_source on public.document_links(source_doc_id);
create index if not exists idx_doc_links_target on public.document_links(target_doc_id);
create index if not exists idx_tags_name on public.tags(name);

-- pgvector HNSW 인덱스 (코사인 거리 기준 빠른 유사도 검색)
create index if not exists idx_chunks_embedding_hnsw 
on public.document_chunks 
using hnsw (embedding vector_cosine_ops);

-- ==============================================================================
-- 6. 벡터 검색 RPC 함수 (match_document_chunks)
-- ==============================================================================
create or replace function public.match_document_chunks(
    query_embedding vector(1536),
    match_threshold float default 0.5,
    match_count int default 5,
    filter_doc_id uuid default null
)
returns table (
    id uuid,
    document_id uuid,
    title text,
    chunk_index int,
    page_number int,
    content text,
    similarity float
)
language plpgsql
stable
as $$
begin
    return query
    select
        dc.id,
        dc.document_id,
        d.title,
        dc.chunk_index,
        dc.page_number,
        dc.content,
        (1 - (dc.embedding <=> query_embedding))::float as similarity
    from public.document_chunks dc
    inner join public.documents d on d.id = dc.document_id
    where 
        (filter_doc_id is null or dc.document_id = filter_doc_id)
        and dc.embedding is not null
        and (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    order by similarity desc
    limit match_count;
end;
$$;

-- RLS (Row Level Security) 설정 및 기본 읽기/쓰기 허용 (세컨드 브레인 개인/데모 환경)
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.tags enable row level security;
alter table public.document_tags enable row level security;
alter table public.document_links enable row level security;

-- 누구나 조회 및 조작 가능하도록 기본 정책 부여 (Anon + Authenticated + Service Role)
create policy "Allow all on documents" on public.documents for all using (true) with check (true);
create policy "Allow all on document_chunks" on public.document_chunks for all using (true) with check (true);
create policy "Allow all on tags" on public.tags for all using (true) with check (true);
create policy "Allow all on document_tags" on public.document_tags for all using (true) with check (true);
create policy "Allow all on document_links" on public.document_links for all using (true) with check (true);
