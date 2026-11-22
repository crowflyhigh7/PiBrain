'use client';

import React from 'react';
import { 
  Plus, 
  FolderGit2, 
  Layers, 
  Globe, 
  FileText, 
  PenTool, 
  Tag as TagIcon,
  Sparkles,
  Network
} from 'lucide-react';
import { SourceType, Tag } from '@/types/database';

interface SidebarProps {
  currentView: 'list' | 'graph';
  onViewChange: (view: 'list' | 'graph') => void;
  selectedFilter: string; // 'all' | 'web' | 'pdf' | 'note'
  onFilterChange: (filter: string) => void;
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  onOpenCaptureModal: () => void;
  typeCounts: { all: number; web: number; pdf: number; note: number };
  tags: Tag[];
}

export default function Sidebar({
  currentView,
  onViewChange,
  selectedFilter,
  onFilterChange,
  selectedTag,
  onTagChange,
  onOpenCaptureModal,
  typeCounts,
  tags,
}: SidebarProps) {
  const filters: { id: string; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: '전체 자료', icon: <Layers className="w-4 h-4 text-indigo-400" />, count: typeCounts.all },
    { id: 'web', label: '웹 기사', icon: <Globe className="w-4 h-4 text-blue-400" />, count: typeCounts.web },
    { id: 'pdf', label: 'PDF 문서', icon: <FileText className="w-4 h-4 text-rose-400" />, count: typeCounts.pdf },
    { id: 'note', label: '개인 메모', icon: <PenTool className="w-4 h-4 text-emerald-400" />, count: typeCounts.note },
  ];

  return (
    <aside className="w-[240px] flex-shrink-0 bg-surface border-r border-border h-screen flex flex-col select-none">
      {/* 로고 영역 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">PiBrain</h1>
            <p className="text-[11px] text-slate-400">AI 세컨드 브레인</p>
          </div>
        </div>
      </div>

      {/* 새 자료 추가 액션 버튼 */}
      <div className="p-3">
        <button
          onClick={onOpenCaptureModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all duration-150 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>새 자료 추가</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* 네비게이션 뷰 전환 */}
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            화면 뷰
          </p>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange('list')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'list'
                  ? 'bg-surface-elevated text-white border border-border-light shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <span>아카이브 목록</span>
            </button>
            <button
              onClick={() => onViewChange('graph')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                currentView === 'graph'
                  ? 'bg-surface-elevated text-white border border-border-light shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
              }`}
            >
              <Network className="w-4 h-4 text-emerald-400" />
              <span>지식 그래프 맵</span>
            </button>
          </div>
        </div>

        {/* 스마트 필터 */}
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            스마트 필터
          </p>
          <div className="space-y-1">
            {filters.map((f) => {
              const isActive = selectedFilter === f.id && selectedTag === null;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    onFilterChange(f.id);
                    onTagChange(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {f.icon}
                    <span>{f.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-surface-elevated text-slate-400'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 태그 클라우드/트리 */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              태그 분류
            </p>
            {selectedTag && (
              <button
                onClick={() => onTagChange(null)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                초기화
              </button>
            )}
          </div>

          {tags.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-400">등록된 태그가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-1 px-1 pt-1">
              {tags.map((tag) => {
                const isSelected = selectedTag === tag.name;
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) {
                        onTagChange(null);
                      } else {
                        onTagChange(tag.name);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-surface-elevated text-slate-300 hover:bg-slate-800 hover:text-white border border-border'
                    }`}
                  >
                    <TagIcon className="w-2.5 h-2.5 opacity-70" />
                    <span>#{tag.name}</span>
                    {tag.count !== undefined && tag.count > 0 && (
                      <span className="opacity-60 text-[9px]">({tag.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 사이드바 하단 정보 */}
      <div className="p-3 border-t border-border text-[11px] text-slate-400 flex items-center justify-between">
        <span>Supabase + pgvector</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="연결 준비됨" />
      </div>
    </aside>
  );
}
