import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { parseWebArticle } from '@/lib/parsers/web-parser';
import { parsePdfBuffer } from '@/lib/parsers/pdf-parser';
import { processDocumentAI } from '@/lib/ai-processor';
import { SourceType } from '@/types/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/documents
 * 문서 목록 조회 (필터링, 검색, 정렬 지원)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'all', 'web', 'pdf', 'note'
    const tag = searchParams.get('tag'); // 태그명
    const search = searchParams.get('search'); // 검색 키워드
    const sort = searchParams.get('sort') || 'latest'; // 'latest' | 'links'

    const supabase = getServiceSupabase();

    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        source_type,
        source_url,
        summary,
        created_at,
        document_tags (
          tag:tags (
            id,
            name
          )
        )
      `);

    // 타입 필터
    if (type && type !== 'all' && ['web', 'pdf', 'note'].includes(type)) {
      query = query.eq('source_type', type);
    }

    // 키워드 검색
    if (search && search.trim().length > 0) {
      query = query.or(`title.ilike.%${search.trim()}%,raw_content.ilike.%${search.trim()}%`);
    }

    // 기본 정렬: 최신순
    query = query.order('created_at', { ascending: false });

    const { data: documents, error } = await query;

    if (error) {
      console.error('문서 조회 실패:', error);
      return NextResponse.json({ error: '문서 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 백링크 연결 수 집계 (모든 document_links 조회)
    const { data: allLinks } = await supabase
      .from('document_links')
      .select('source_doc_id, target_doc_id');

    const linkCountMap = new Map<string, number>();
    if (allLinks) {
      for (const link of allLinks) {
        linkCountMap.set(link.source_doc_id, (linkCountMap.get(link.source_doc_id) || 0) + 1);
        linkCountMap.set(link.target_doc_id, (linkCountMap.get(link.target_doc_id) || 0) + 1);
      }
    }

    // 포맷팅 및 태그 추출
    let formattedDocs = (documents || []).map((doc: any) => {
      const tags = (doc.document_tags || [])
        .map((dt: any) => dt.tag)
        .filter(Boolean);

      return {
        id: doc.id,
        title: doc.title,
        source_type: doc.source_type as SourceType,
        source_url: doc.source_url,
        summary: doc.summary,
        created_at: doc.created_at,
        tags,
        backlinks_count: linkCountMap.get(doc.id) || 0,
      };
    });

    // 태그 필터링이 요청된 경우 클라이언트 레벨에서 정확히 필터링
    if (tag && tag.trim().length > 0) {
      const targetTag = tag.trim().toLowerCase();
      formattedDocs = formattedDocs.filter((doc) =>
        doc.tags.some((t: any) => t.name.toLowerCase() === targetTag)
      );
    }

    // 연결 많은 순 정렬인 경우 재정렬
    if (sort === 'links') {
      formattedDocs.sort((a, b) => (b.backlinks_count || 0) - (a.backlinks_count || 0));
    }

    return NextResponse.json({ documents: formattedDocs });
  } catch (err: unknown) {
    console.error('GET /api/documents 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * 통합 수집 및 AI 인덱싱 (web, pdf, note)
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let sourceType: SourceType = 'note';
    let title = '';
    let rawContent = '';
    let sourceUrl: string | null = null;
    let pages: { pageNumber: number; text: string }[] | undefined = undefined;

    // 1. multipart/form-data (PDF 업로드)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const customTitle = formData.get('title') as string | null;

      if (!file) {
        return NextResponse.json({ error: '업로드할 PDF 파일이 없습니다.' }, { status: 400 });
      }

      // 용량 제한 검사 (최대 25MB)
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF 파일 크기는 최대 25MB까지 지원됩니다.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const parsedPdf = await parsePdfBuffer(buffer);
      sourceType = 'pdf';
      title = (customTitle && customTitle.trim()) || file.name.replace(/\.pdf$/i, '') || 'PDF 문서';
      rawContent = parsedPdf.fullText;
      pages = parsedPdf.pages;

      if (!rawContent || rawContent.trim().length === 0) {
        return NextResponse.json({ error: 'PDF에서 텍스트를 추출할 수 없습니다. 스캔 이미지 전용 PDF일 수 있습니다.' }, { status: 422 });
      }
    } else {
      // 2. application/json (web 또는 note)
      const body = await req.json();
      sourceType = body.source_type;

      if (!['web', 'note'].includes(sourceType)) {
        return NextResponse.json({ error: '유효한 source_type(web, note)을 전달해주세요.' }, { status: 400 });
      }

      if (sourceType === 'web') {
        const url = body.url?.trim();
        if (!url) {
          return NextResponse.json({ error: '수집할 웹 기사 URL을 입력해주세요.' }, { status: 400 });
        }

        const parsedWeb = await parseWebArticle(url);
        sourceType = 'web';
        sourceUrl = url;
        title = body.title?.trim() || parsedWeb.title || '웹 기사';
        rawContent = parsedWeb.content;
      } else if (sourceType === 'note') {
        title = body.title?.trim() || '새로운 메모';
        rawContent = body.content?.trim() || '';

        if (!rawContent) {
          return NextResponse.json({ error: '메모 본문 내용을 입력해주세요.' }, { status: 400 });
        }
      }
    }

    const supabase = getServiceSupabase();

    // 3. documents 테이블에 기본 레코드 생성
    const { data: newDoc, error: insertError } = await supabase
      .from('documents')
      .insert({
        title,
        source_type: sourceType,
        source_url: sourceUrl,
        raw_content: rawContent,
        summary: null,
      })
      .select('id, title, source_type, source_url, created_at')
      .single();

    if (insertError || !newDoc) {
      console.error('문서 DB 삽입 실패:', insertError);
      return NextResponse.json({ error: '문서를 데이터베이스에 저장하지 못했습니다.' }, { status: 500 });
    }

    // 4. AI 파이프라인 비동기 가공 (요약, 태깅, 청킹, 임베딩, 자동 백링크)
    // 사용자에게 즉시 응답하거나 파이프라인 완료 후 응답. PKM의 일관성을 위해 완료 후 반환
    const aiResult = await processDocumentAI({
      documentId: newDoc.id,
      title: newDoc.title,
      content: rawContent,
      sourceType,
      pages,
    });

    return NextResponse.json({
      success: true,
      document: {
        ...newDoc,
        summary: aiResult.summary,
        tags: aiResult.tags,
        chunk_count: aiResult.chunkCount,
        backlink_count: aiResult.backlinkCount,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/documents 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '문서 수집 및 인덱싱 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
