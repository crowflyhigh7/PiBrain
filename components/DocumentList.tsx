'use client';

import React from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Globe, 
  FileText, 
  PenTool, 
  Network, 
  Tag as TagIcon, 
  Calendar, 
  Sparkles,
  Inbox
} from 'lucide-react';
import { Document, SourceType } from '@/types/database';

interface DocumentListProps {
  documents: Document[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: 'latest' | 'links';
  onSortChange: (sort: 'latest' | 'links') => void;
  onSelectDocument: (doc: Document) => void;
  isLoading: boolean;
  onOpenCaptureModal: () => void;
}

export default function DocumentList({
  documents,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  onSelectDocument,
  isLoading,
  onOpenCaptureModal,
}: DocumentListProps) {
  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'note':
        return <PenTool className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getSourceBadge = (type: SourceType) => {
    switch (type) {
      case 'web':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">웹 기사</span>;
      case 'pdf':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">PDF 문서</span>;
      case 'note':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">메모</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* 상단 컨트롤 바 (검색 + 정렬) */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface/40 backdrop-blur-sm">
        {/* 실시간 검색 인풋 */}
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="자료 제목, 본문 키워드 검색..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* 정렬 드롭다운/버튼 */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 text-xs">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> 정렬:
            </span>
            <button
              onClick={() => onSortChange('latest')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                sortOption === 'latest'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => onSortChange('links')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                sortOption === 'links'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              연결 많은 순
            </button>
          </div>
        </div>
      </div>

      {/* 카드 리스트 본문 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl bg-surface/50 border border-border animate-pulse p-5"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-slate-400 mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">등록된 자료가 없습니다</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5">
              관심 있는 웹 기사 URL이나 PDF 문서, 개인 아이디어 메모를 수집하여 AI 지식 그래프를 구성해보세요.
            </p>
            <button
              onClick={onOpenCaptureModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>첫 자료 수집하기</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="group relative bg-surface border border-border hover:border-indigo-500/50 hover:bg-surface-elevated/70 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
              >
                <div>
                  {/* 상단 메타: 타입 뱃지 + 연결 수 */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-surface-elevated border border-border group-hover:border-slate-600 transition-colors">
                        {getSourceIcon(doc.source_type)}
                      </div>
                      {getSourceBadge(doc.source_type)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
                      <Network className="w-3 h-3 text-indigo-400" />
                      <span>{doc.backlinks_count || 0}개 연결</span>
                    </div>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                    {doc.title}
                  </h3>

                  {/* AI 3줄 요약 */}
                  {doc.summary ? (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4 bg-background/40 p-2.5 rounded-xl border border-border/60">
                      {doc.summary}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4">
                      요약 정보가 없습니다.
                    </p>
                  )}
                </div>

                {/* 하단 태그 및 날짜 */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 overflow-hidden max-h-6">
                    {doc.tags && doc.tags.length > 0 ? (
                      doc.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id || tag.name}
                          className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md"
                        >
                          #{tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">태그 없음</span>
                    )}
                    {doc.tags && doc.tags.length > 3 && (
                      <span className="text-[10px] text-slate-400 px-1">+{doc.tags.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
