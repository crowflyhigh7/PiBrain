'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DocumentList from '@/components/DocumentList';
import DocumentReader from '@/components/DocumentReader';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import AICopilot from '@/components/AICopilot';
import CaptureModal from '@/components/CaptureModal';
import { Document, Tag, SourceType } from '@/types/database';

export default function Home() {
  // 뷰 상태: 'list' | 'graph'
  const [currentView, setCurrentView] = useState<'list' | 'graph'>('list');
  // 상세 리더 뷰 상태: 문서 ID가 있으면 리더 모드로 활성화
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // 문서 목록 및 태그 데이터
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 필터 및 검색/정렬 상태
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'latest' | 'links'>('latest');

  // UI 모달 및 사이드 패널 상태
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

  // 문서 목록 불러오기
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') params.set('type', selectedFilter);
      if (selectedTag) params.set('tag', selectedTag);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (sortOption) params.set('sort', sortOption);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('문서 목록 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter, selectedTag, searchQuery, sortOption]);

  // 태그 목록 불러오기
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('태그 조회 실패:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // 타입별 문서 개수 집계
  const typeCounts = useMemo(() => {
    const counts = { all: 0, web: 0, pdf: 0, note: 0 };
    for (const d of documents) {
      counts.all++;
      if (d.source_type === 'web') counts.web++;
      if (d.source_type === 'pdf') counts.pdf++;
      if (d.source_type === 'note') counts.note++;
    }
    return counts;
  }, [documents]);

  // 현재 활성화된 문서 객체
  const activeDocument = useMemo(() => {
    if (!activeDocId) return null;
    return documents.find((d) => d.id === activeDocId) || null;
  }, [activeDocId, documents]);

  // 특정 문서로 바로 이동 (인용 각주, 지식 그래프 노드, 연관 노트 등에서 호출)
  const handleNavigateToDoc = (docId: string) => {
    setActiveDocId(docId);
    setCurrentView('list'); // 리더 모드를 보여주기 위해 리스트 뷰 컨텍스트로 전환
  };

  // 새 자료 등록 성공 핸들러
  const handleCaptureSuccess = (newDoc: any) => {
    fetchDocuments();
    fetchTags();
    if (newDoc?.id) {
      setActiveDocId(newDoc.id);
    }
  };

  // 문서 삭제 완료 핸들러
  const handleDocumentDeleted = (deletedDocId: string) => {
    setActiveDocId(null);
    fetchDocuments();
    fetchTags();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 1. 좌측 사이드바 (240px) */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'graph') {
            setActiveDocId(null); // 그래프로 전환 시 상세 리더 닫기
          }
        }}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
        typeCounts={typeCounts}
        tags={tags}
      />

      {/* 2. 중앙 메인 뷰 (flex-1) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {currentView === 'graph' ? (
          // 2-C. 지식 그래프 모드
          <KnowledgeGraph onSelectDocument={handleNavigateToDoc} />
        ) : activeDocId ? (
          // 2-B. 상세 리더 모드
          <DocumentReader
            documentId={activeDocId}
            onBack={() => setActiveDocId(null)}
            onNavigateToDoc={handleNavigateToDoc}
            onDocumentDeleted={handleDocumentDeleted}
            allDocuments={documents}
          />
        ) : (
          // 2-A. 리스트 모드 (기본)
          <DocumentList
            documents={documents}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            onSelectDocument={(doc) => setActiveDocId(doc.id)}
            isLoading={isLoading}
            onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
          />
        )}
      </main>

      {/* 3. 우측 AI 코파일럿 패널 (360px) */}
      <AICopilot
        currentDocument={activeDocument}
        onNavigateToDoc={handleNavigateToDoc}
        isOpen={isCopilotOpen}
        onToggleOpen={() => setIsCopilotOpen(!isCopilotOpen)}
      />

      {/* 4. 새 자료 통합 수집 모달 */}
      <CaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onSuccess={handleCaptureSuccess}
      />
    </div>
  );
}
