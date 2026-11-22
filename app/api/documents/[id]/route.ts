import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { DocumentLinkInfo, SourceType } from '@/types/database';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/documents/[id]
 * 단일 문서 상세 조회 (본문, 태그, 연결된 백링크 목록 포함)
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const documentId = params.id;
    const supabase = getServiceSupabase();

    // 1. 문서 기본 정보 및 태그 조회
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        source_type,
        source_url,
        raw_content,
        summary,
        created_at,
        document_tags (
          tag:tags (
            id,
            name
          )
        )
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: '요청한 문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 연결된 문서(백링크) 목록 조회 (현재 문서가 source이거나 target인 모든 링크)
    const { data: outgoingLinks } = await supabase
      .from('document_links')
      .select(`
        id,
        similarity_score,
        link_type,
        target_doc:documents!target_doc_id (
          id,
          title,
          source_type
        )
      `)
      .eq('source_doc_id', documentId);

    const { data: incomingLinks } = await supabase
      .from('document_links')
      .select(`
        id,
        similarity_score,
        link_type,
        source_doc:documents!source_doc_id (
          id,
          title,
          source_type
        )
      `)
      .eq('target_doc_id', documentId);

    const linkedDocuments: DocumentLinkInfo[] = [];

    if (outgoingLinks) {
      for (const link of outgoingLinks) {
        if (link.target_doc) {
          const doc = link.target_doc as any;
          linkedDocuments.push({
            link_id: link.id,
            linked_doc_id: doc.id,
            title: doc.title,
            source_type: doc.source_type as SourceType,
            similarity_score: link.similarity_score,
            link_type: link.link_type as 'auto' | 'manual',
            is_outgoing: true,
          });
        }
      }
    }

    if (incomingLinks) {
      for (const link of incomingLinks) {
        if (link.source_doc) {
          const doc = link.source_doc as any;
          // 중복 방지
          if (!linkedDocuments.some((ld) => ld.linked_doc_id === doc.id)) {
            linkedDocuments.push({
              link_id: link.id,
              linked_doc_id: doc.id,
              title: doc.title,
              source_type: doc.source_type as SourceType,
              similarity_score: link.similarity_score,
              link_type: link.link_type as 'auto' | 'manual',
              is_outgoing: false,
            });
          }
        }
      }
    }

    const tags = (document.document_tags || [])
      .map((dt: any) => dt.tag)
      .filter(Boolean);

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        source_type: document.source_type,
        source_url: document.source_url,
        raw_content: document.raw_content,
        summary: document.summary,
        created_at: document.created_at,
        tags,
        backlinks_count: linkedDocuments.length,
        linked_documents: linkedDocuments,
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/documents/[id] 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '문서를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * 문서 삭제 (CASCADE로 청크, 태그 연결, 백링크 자동 정리)
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const documentId = params.id;
    const supabase = getServiceSupabase();

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('문서 삭제 실패:', error);
      return NextResponse.json({ error: '문서 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '문서가 성공적으로 삭제되었습니다.' });
  } catch (err: unknown) {
    console.error('DELETE /api/documents/[id] 에러:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '문서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
