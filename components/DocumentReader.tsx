'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  ExternalLink, 
  Trash2, 
  Globe, 
  FileText, 
  PenTool, 
  Network, 
  Tag as TagIcon, 
  Plus, 
  X, 
  Calendar, 
  Sparkles, 
  Loader2, 
  Search,
  Check
} from 'lucide-react';
import { Document, DocumentLinkInfo, SourceType } from '@/types/database';

interface DocumentReaderProps {
  documentId: string;
  onBack: () => void;
  onNavigateToDoc: (docId: string) => void;
  onDocumentDeleted: (deletedDocId: string) => void;
  allDocuments: Document[]; // 수동 링크 추가 검색용
}

export default function DocumentReader({
  documentId,
  onBack,
  onNavigateToDoc,
  onDocumentDeleted,
  allDocuments,
}: DocumentReaderProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 수동 링크 추가 모달/팝오버 상태
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null);

  // 문서 상세 데이터 불러오기
  const fetchDocumentDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) {
        throw new Error('문서를 불러오지 못했습니다.');
      }
      const data = await res.json();
      setDoc(data.document);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '문서 로딩 에러');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetail(documentId);
    }
  }, [documentId]);

  // 문서 삭제 처리
  const handleDelete = async () => {
    if (!doc) return;
    if (!window.confirm(`'${doc.title}' 문서를 삭제하시겠습니까? 연결된 지식 링크와 청크도 함께 정리됩니다.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('삭제 처리 중 오류가 발생했습니다.');
      }
      onDocumentDeleted(doc.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제 실패');
      setDeleting(false);
    }
  };

  // 수동 링크 추가/삭제
  const handleToggleLink = async (targetDocId: string, currentIsLinked: boolean) => {
    if (!doc) return;
    setLinkingDocId(targetDocId);

    try {
      const res = await fetch(`/api/documents/${doc.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_doc_id: targetDocId,
          action: currentIsLinked ? 'remove' : 'add',
        }),
      });

      if (!res.ok) {
        throw new Error('링크 변경에 실패했습니다.');
      }

      // 새로고침
      await fetchDocumentDetail(doc.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '링크 업데이트 오류');
    } finally {
      setLinkingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs">문서 및 연관 노트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-background p-6">
        <p className="text-sm text-rose-400 mb-4">{error || '문서를 찾을 수 없습니다.'}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated text-xs text-white border border-border hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>목록으로 돌아가기</span>
        </button>
      </div>
    );
  }

  // 연결 가능한 다른 문서 목록 필터링 (현재 본인 및 이미 연결된 문서 제외)
  const connectedIds = new Set((doc.linked_documents || []).map((l) => l.linked_doc_id));
  const candidateDocs = allDocuments.filter(
    (d) =>
      d.id !== doc.id &&
      (linkSearchQuery.trim() === '' ||
        d.title.toLowerCase().includes(linkSearchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* 상단 툴바 */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </button>

          {doc.source_url && (
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>원본 웹 페이지 방문</span>
            </a>
          )}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          <span>문서 삭제</span>
        </button>
      </div>

      {/* 리더 본문 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
        {/* 문서 헤더 */}
        <div className="space-y-4 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            {doc.source_type === 'web' && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Globe className="w-3.5 h-3.5" /> 웹 기사
              </span>
            )}
            {doc.source_type === 'pdf' && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                <FileText className="w-3.5 h-3.5" /> PDF 문서
              </span>
            )}
            {doc.source_type === 'note' && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <PenTool className="w-3.5 h-3.5" /> 개인 메모
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {doc.created_at?.slice(0, 10)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">
            {doc.title}
          </h1>

          {/* 태그 목록 */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {doc.tags.map((t) => (
                <span
                  key={t.id || t.name}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-surface-elevated text-indigo-300 border border-border"
                >
                  <TagIcon className="w-3 h-3 opacity-60" />
                  <span>#{t.name}</span>
                </span>
              ))}
            </div>
          )}

          {/* AI 3줄 요약 콜아웃 */}
          {doc.summary && (
            <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-200">
              <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI 핵심 3줄 요약</span>
              </div>
              <div className="text-xs leading-relaxed whitespace-pre-line text-slate-200 font-sans">
                {doc.summary}
              </div>
            </div>
          )}
        </div>

        {/* 본문 뷰어 (마크다운 렌더링) */}
        <div className="markdown-body text-slate-200 text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.raw_content}
          </ReactMarkdown>
        </div>

        {/* 하단 연관 노트(Backlinks) 패널 */}
        <div className="mt-12 pt-8 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">
                연관 노트 (Backlinks & Related)
              </h2>
              <span className="text-xs bg-surface-elevated text-slate-300 px-2 py-0.5 rounded-full border border-border">
                {doc.linked_documents?.length || 0}개
              </span>
            </div>

            <button
              onClick={() => setIsAddingLink(!isAddingLink)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-indigo-300 hover:text-white hover:bg-surface-elevated transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>수동 연결 추가</span>
            </button>
          </div>

          {/* 수동 링크 추가 검색 팝오버/패널 */}
          {isAddingLink && (
            <div className="p-4 rounded-2xl bg-surface border border-indigo-500/30 space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">연결할 다른 문서 검색</p>
                <button
                  onClick={() => setIsAddingLink(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  placeholder="문서 제목 검색..."
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {candidateDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    연결할 수 있는 다른 문서가 없습니다.
                  </p>
                ) : (
                  candidateDocs.map((cDoc) => {
                    const isAlreadyLinked = connectedIds.has(cDoc.id);
                    return (
                      <div
                        key={cDoc.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-elevated text-xs transition-colors"
                      >
                        <span className="text-slate-200 line-clamp-1 flex-1 mr-2">{cDoc.title}</span>
                        <button
                          onClick={() => handleToggleLink(cDoc.id, isAlreadyLinked)}
                          disabled={linkingDocId === cDoc.id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            isAlreadyLinked
                              ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          {linkingDocId === cDoc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isAlreadyLinked ? (
                            '연결 해제'
                          ) : (
                            '링크 연결'
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 연결된 문서 카드 그리드 */}
          {(!doc.linked_documents || doc.linked_documents.length === 0) ? (
            <p className="text-xs text-slate-400 py-4 text-center bg-surface/30 rounded-2xl border border-border/50">
              현재 연결된 연관 노트가 없습니다. 새 자료를 등록하거나 상단의 '수동 연결 추가'를 눌러 지식을 연결해보세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doc.linked_documents.map((link) => (
                <div
                  key={link.link_id}
                  className="group bg-surface border border-border hover:border-indigo-500/50 rounded-xl p-3.5 flex flex-col justify-between transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      onClick={() => onNavigateToDoc(link.linked_doc_id)}
                      className="text-left font-medium text-xs text-white group-hover:text-indigo-300 transition-colors line-clamp-2"
                    >
                      {link.title}
                    </button>
                    <button
                      onClick={() => handleToggleLink(link.linked_doc_id, true)}
                      title="연결 해제"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-border/40">
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        link.link_type === 'auto'
                          ? 'bg-indigo-500/10 text-indigo-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {link.link_type === 'auto' ? 'AI 자동 연결' : '수동 링크'}
                    </span>

                    {link.similarity_score !== null && (
                      <span className="text-slate-400">
                        유사도 {(link.similarity_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
