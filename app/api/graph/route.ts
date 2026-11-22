import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { GraphData, GraphNode, GraphLink, SourceType } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/graph
 * 지식 그래프 시각화용 전체 노드 및 엣지(링크) 데이터 반환
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // 1. 모든 문서 조회
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, source_type, summary');

    if (docError) {
      console.error('그래프 문서 조회 실패:', docError);
      return NextResponse.json({ error: '지식 그래프 데이터를 불러오지 못했습니다.' }, { status: 500 });
    }

    // 2. 모든 링크 조회
    const { data: links, error: linkError } = await supabase
      .from('document_links')
      .select('source_doc_id, target_doc_id, similarity_score, link_type');

    if (linkError) {
      console.error('그래프 링크 조회 실패:', linkError);
      return NextResponse.json({ error: '링크 데이터를 불러오지 못했습니다.' }, { status: 500 });
    }

    // 문서 ID 집합 (존재하는 문서 간의 링크만 유효화)
    const docIdSet = new Set((documents || []).map((d) => d.id));

    // 연결 수 계산
    const degreeMap = new Map<string, number>();
    const validLinks: GraphLink[] = [];

    for (const link of links || []) {
      if (docIdSet.has(link.source_doc_id) && docIdSet.has(link.target_doc_id)) {
        degreeMap.set(link.source_doc_id, (degreeMap.get(link.source_doc_id) || 0) + 1);
        degreeMap.set(link.target_doc_id, (degreeMap.get(link.target_doc_id) || 0) + 1);

        validLinks.push({
          source: link.source_doc_id,
          target: link.target_doc_id,
          similarity: link.similarity_score,
          type: link.link_type as 'auto' | 'manual',
        });
      }
    }

    // 노드 구성 (연결 수가 많을수록 val 확대)
    const nodes: GraphNode[] = (documents || []).map((doc) => {
      const degree = degreeMap.get(doc.id) || 0;
      return {
        id: doc.id,
        name: doc.title,
        title: doc.title,
        source_type: doc.source_type as SourceType,
        summary: doc.summary,
        val: 4 + degree * 2, // 기본 크기 4에 연결당 +2
      };
    });

    const graphData: GraphData = {
      nodes,
      links: validLinks,
    };

    return NextResponse.json(graphData);
  } catch (err: unknown) {
    console.error('GET /api/graph 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '지식 그래프 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
