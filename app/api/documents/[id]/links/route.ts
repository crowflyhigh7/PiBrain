import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/documents/[id]/links
 * 수동 백링크 추가 또는 연결 해제
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const sourceDocId = params.id;
    const body = await req.json();
    const { target_doc_id, action } = body; // action: 'add' | 'remove'

    if (!target_doc_id) {
      return NextResponse.json({ error: '연결할 대상 문서 ID(target_doc_id)를 전달해주세요.' }, { status: 400 });
    }

    if (sourceDocId === target_doc_id) {
      return NextResponse.json({ error: '문서 자신에게 링크를 걸 수 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    if (action === 'remove') {
      // 양방향 모두 확인하여 삭제
      const { error } = await supabase
        .from('document_links')
        .delete()
        .or(
          `and(source_doc_id.eq.${sourceDocId},target_doc_id.eq.${target_doc_id}),and(source_doc_id.eq.${target_doc_id},target_doc_id.eq.${sourceDocId})`
        );

      if (error) {
        console.error('링크 삭제 실패:', error);
        return NextResponse.json({ error: '연관 링크 해제 중 오류가 발생했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '연결이 해제되었습니다.' });
    } else {
      // 링크 추가 (manual)
      const { data, error } = await supabase
        .from('document_links')
        .upsert(
          {
            source_doc_id: sourceDocId,
            target_doc_id: target_doc_id,
            link_type: 'manual',
            similarity_score: 1.0,
          },
          { onConflict: 'source_doc_id,target_doc_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('링크 추가 실패:', error);
        return NextResponse.json({ error: '연관 링크 생성 중 오류가 발생했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, link: data, message: '수동 링크가 연결되었습니다.' });
    }
  } catch (err: unknown) {
    console.error('POST /api/documents/[id]/links 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '링크 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
