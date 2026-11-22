import { getServiceSupabase } from './supabase';
import { generateSummaryAndTags, createEmbeddings } from './ai-provider';
import { chunkText, chunkPages } from './text-chunker';
import { createAutoBacklinks } from './auto-linker';

export interface ProcessDocumentOptions {
  documentId: string;
  title: string;
  content: string;
  sourceType: 'web' | 'pdf' | 'note';
  pages?: { pageNumber: number; text: string }[];
}

export interface ProcessDocumentResult {
  summary: string;
  tags: string[];
  chunkCount: number;
  backlinkCount: number;
}

export async function processDocumentAI(
  options: ProcessDocumentOptions
): Promise<ProcessDocumentResult> {
  const { documentId, title, content, sourceType, pages } = options;
  const supabase = getServiceSupabase();

  // 1. AI 3줄 요약 및 태그 생성
  const { summary, tags } = await generateSummaryAndTags(content, title);

  // 2. 문서 요약 업데이트
  await supabase
    .from('documents')
    .update({ summary })
    .eq('id', documentId);

  // 3. 태그 저장 및 연결 (tags, document_tags)
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const cleanTagName = tagName.trim();
      if (!cleanTagName) continue;

      // 태그 조회 또는 생성
      let tagId: string | null = null;
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', cleanTagName)
        .maybeSingle();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagInsertErr } = await supabase
          .from('tags')
          .insert({ name: cleanTagName })
          .select('id')
          .single();

        if (!tagInsertErr && newTag) {
          tagId = newTag.id;
        }
      }

      if (tagId) {
        await supabase
          .from('document_tags')
          .upsert(
            { document_id: documentId, tag_id: tagId },
            { onConflict: 'document_id,tag_id', ignoreDuplicates: true }
          );
      }
    }
  }

  // 4. 청킹 분할
  let chunks = [];
  if (sourceType === 'pdf' && pages && pages.length > 0) {
    chunks = chunkPages(pages, 900, 150);
  } else {
    chunks = chunkText(content, 900, 150);
  }

  if (chunks.length === 0) {
    chunks = [{ chunkIndex: 0, content: content.slice(0, 900), pageNumber: null }];
  }

  // 5. 청크 임베딩 생성 (text-embedding-3-small)
  const chunkContents = chunks.map((c) => c.content);
  const embeddings = await createEmbeddings(chunkContents);

  // 6. document_chunks 일괄 저장
  const rowsToInsert = chunks.map((c, idx) => ({
    document_id: documentId,
    chunk_index: c.chunkIndex,
    page_number: c.pageNumber,
    content: c.content,
    embedding: embeddings[idx],
  }));

  const { error: chunkInsertErr } = await supabase
    .from('document_chunks')
    .insert(rowsToInsert);

  if (chunkInsertErr) {
    console.error('청크 삽입 중 오류:', chunkInsertErr);
  }

  // 7. 자동 백링크 생성 (첫 청크 임베딩 기준 유사 문서 자동 연결)
  let backlinkCount = 0;
  if (embeddings.length > 0 && embeddings[0]) {
    backlinkCount = await createAutoBacklinks(documentId, embeddings[0]);
  }

  return {
    summary,
    tags,
    chunkCount: chunks.length,
    backlinkCount,
  };
}
