import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { createEmbedding, generateChatAnswer } from '@/lib/ai-provider';
import { Citation, MatchedChunk } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat
 * RAG 기반 출처 연동 지식 질의응답
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, filter_doc_id, history } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: '질문 내용을 입력해주세요.' }, { status: 400 });
    }

    const cleanQuestion = question.trim();
    const supabase = getServiceSupabase();

    // 1. 사용자 질문 임베딩 생성 (text-embedding-3-small)
    const questionEmbedding = await createEmbedding(cleanQuestion);

    // 2. match_document_chunks RPC 함수 호출하여 상위 5개 관련 청크 검색
    const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: questionEmbedding,
      match_threshold: 0.35, // 검색 매칭 임계치
      match_count: 5,
      filter_doc_id: filter_doc_id || null,
    });

    if (rpcError) {
      console.error('청크 검색 RPC 에러:', rpcError);
      return NextResponse.json(
        { error: '벡터 검색 처리 중 데이터베이스 오류가 발생했습니다: ' + rpcError.message },
        { status: 500 }
      );
    }

    const matchedChunks: MatchedChunk[] = chunks || [];

    // 3. 만약 관련된 청크가 전혀 검색되지 않는 경우
    if (matchedChunks.length === 0) {
      return NextResponse.json({
        answer: '저장된 아카이브에서 관련 내용을 찾을 수 없습니다.',
        citations: [],
      });
    }

    // 4. 프롬프트 컨텍스트 구성
    const contextText = matchedChunks
      .map((c, idx) => {
        const pageInfo = c.page_number ? `p.${c.page_number}` : '';
        return `[청크 ${idx + 1}]
문서ID: ${c.document_id}
문서제목: ${c.title}
${pageInfo ? `페이지: ${pageInfo}` : ''}
내용:
${c.content}
---`;
      })
      .join('\n\n');

    // 5. 시스템 프롬프트 작성
    const systemPrompt = `당신은 사용자의 신뢰할 수 있는 AI 세컨드 브레인(PKM) 코파일럿입니다.
아래 제공된 [검색된 지식 컨텍스트(Context)]만을 근거로 하여 사용자의 질문에 정확하고 명료하게 답변하세요.

[규칙]
1. 반드시 제공된 컨텍스트 내의 사실만을 근거로 답변하세요.
2. 컨텍스트에 언급되지 않은 사실이나 추측은 절대 답변에 포함하지 마세요. 컨텍스트만으로 답변할 수 없는 경우 "저장된 아카이브에서 관련 내용을 찾을 수 없습니다."라고만 명확히 답변하세요.
3. 근거가 되는 문장의 끝부분이나 인용한 내용 바로 뒤에 반드시 다음 형식의 출처 마커를 추가하세요:
   형식: [문서ID|문서제목|페이지번호]
   예시:
   - PDF 문서인 경우: [3a9c7b12-4f32-4d56-9a1b-123456789abc|머신러닝 기초 보고서|3]
   - 웹 기사나 메모처럼 페이지가 없는 경우: [3a9c7b12-4f32-4d56-9a1b-123456789abc|최신 AI 동향 기사|]
4. 친절하고 전문적인 한국어 존댓말 경어체로 작성하세요.

[검색된 지식 컨텍스트]
${contextText}`;

    // 6. AI 답변 생성
    const rawAnswer = await generateChatAnswer(systemPrompt, cleanQuestion, history || []);

    // 7. 출처(Citation) 정보 파싱
    // 마커 패턴: \[([0-9a-fA-F-]+)\|([^\|]+)\|([0-9]*)\]
    const citationRegex = /\[([0-9a-fA-F-]{36})\|([^\|\]]+)\|([0-9]*)\]/g;
    const citations: Citation[] = [];
    const seenCitations = new Set<string>();

    let match;
    while ((match = citationRegex.exec(rawAnswer)) !== null) {
      const docId = match[1];
      const title = match[2];
      const pageStr = match[3];
      const page = pageStr ? parseInt(pageStr, 10) : null;
      const key = `${docId}_${page || 'all'}`;

      if (!seenCitations.has(key)) {
        seenCitations.add(key);
        citations.push({ docId, title, page });
      }
    }

    // 만약 모델이 마커를 명시적으로 붙이지 못했으나 컨텍스트를 활용한 경우, 매칭된 상위 문서들을 기본 citation으로 추가
    if (citations.length === 0 && rawAnswer !== '저장된 아카이브에서 관련 내용을 찾을 수 없습니다.') {
      for (const mc of matchedChunks.slice(0, 3)) {
        const key = `${mc.document_id}_${mc.page_number || 'all'}`;
        if (!seenCitations.has(key)) {
          seenCitations.add(key);
          citations.push({
            docId: mc.document_id,
            title: mc.title,
            page: mc.page_number,
          });
        }
      }
    }

    return NextResponse.json({
      answer: rawAnswer,
      citations,
      matched_chunks_count: matchedChunks.length,
    });
  } catch (err: unknown) {
    console.error('POST /api/chat 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI 질의응답 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
