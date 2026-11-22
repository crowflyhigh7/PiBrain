-- ==============================================================================
-- Cloudflare D1 Database Schema for PiBrain
-- ==============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('web', 'pdf', 'note')),
    source_url TEXT,
    raw_content TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_links (
    id TEXT PRIMARY KEY,
    source_doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    similarity_score REAL,
    link_type TEXT NOT NULL CHECK (link_type IN ('auto', 'manual')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_doc_id, target_doc_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_source ON document_links(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_target ON document_links(target_doc_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
