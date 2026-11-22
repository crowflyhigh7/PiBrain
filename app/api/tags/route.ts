import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Tag } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tags
 * 전체 태그 목록 및 각 태그별 문서 개수 집계 반환
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // 태그 및 연결된 문서 카운트
    const { data: tags, error } = await supabase
      .from('tags')
      .select(`
        id,
        name,
        created_at,
        document_tags (
          document_id
        )
      `)
      .order('name');

    if (error) {
      console.error('태그 조회 실패:', error);
      return NextResponse.json({ error: '태그 목록을 불러오지 못했습니다.' }, { status: 500 });
    }

    const formattedTags: Tag[] = (tags || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      count: t.document_tags ? t.document_tags.length : 0,
    }));

    return NextResponse.json({ tags: formattedTags });
  } catch (err: unknown) {
    console.error('GET /api/tags 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '태그 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
