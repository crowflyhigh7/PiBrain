import { getServiceSupabase } from './supabase';

/**
 * 두 벡터 간 코사인 유사도를 계산합니다.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 신규 문서가 생성된 후 기존 문서들과의 유사도를 측정하여
 * 코사인 유사도 0.78 이상인 상위 최대 5개 문서를 자동으로 링크합니다.
 */
export async function createAutoBacklinks(
  documentId: string,
  representativeEmbedding: number[]
): Promise<number> {
  const supabase = getServiceSupabase();

  try {
    // 1. match_document_chunks RPC를 사용하여 유사도 0.78 이상 청크 탐색
    const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: representativeEmbedding,
      match_threshold: 0.78,
      match_count: 20,
      filter_doc_id: null,
    });

    let candidateDocIds: { docId: string; score: number }[] = [];

    if (!rpcError && matchedChunks && matchedChunks.length > 0) {
      // 본인 문서 제외 및 문서별 최고 유사도 집계
      const docScoreMap = new Map<string, number>();
      for (const chunk of matchedChunks) {
        if (chunk.document_id !== documentId) {
          const currentMax = docScoreMap.get(chunk.document_id) || 0;
          if (chunk.similarity > currentMax) {
            docScoreMap.set(chunk.document_id, chunk.similarity);
          }
        }
      }

      candidateDocIds = Array.from(docScoreMap.entries())
        .map(([docId, score]) => ({ docId, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    } else {
      // RPC 미동작 시 fallback: 최근 문서들의 첫 청크 임베딩 조회 후 직접 계산
      const { data: otherChunks } = await supabase
        .from('document_chunks')
        .select('document_id, embedding')
        .neq('document_id', documentId)
        .eq('chunk_index', 0)
        .limit(100);

      if (otherChunks && otherChunks.length > 0) {
        for (const item of otherChunks) {
          if (item.embedding && Array.isArray(item.embedding)) {
            const sim = cosineSimilarity(representativeEmbedding, item.embedding);
            if (sim >= 0.78) {
              candidateDocIds.push({ docId: item.document_id, score: sim });
            }
          }
        }
        candidateDocIds = candidateDocIds.sort((a, b) => b.score - a.score).slice(0, 5);
      }
    }

    if (candidateDocIds.length === 0) {
      return 0;
    }

    // 2. document_links 테이블에 양방향 또는 단방향 링크 삽입
    const linksToInsert = candidateDocIds.map((item) => ({
      source_doc_id: documentId,
      target_doc_id: item.docId,
      similarity_score: parseFloat(item.score.toFixed(4)),
      link_type: 'auto' as const,
    }));

    const { error: insertError } = await supabase
      .from('document_links')
      .upsert(linksToInsert, { onConflict: 'source_doc_id,target_doc_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('자동 백링크 생성 실패:', insertError);
      return 0;
    }

    return candidateDocIds.length;
  } catch (err) {
    console.error('자동 링크 처리 중 예외 발생:', err);
    return 0;
  }
}
