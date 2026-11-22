'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Layers, 
  Loader2, 
  ExternalLink,
  BookOpen,
  Trash2
} from 'lucide-react';
import { ChatMessage, Citation, Document } from '@/types/database';

interface AICopilotProps {
  currentDocument: Document | null;
  onNavigateToDoc: (docId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function AICopilot({
  currentDocument,
  onNavigateToDoc,
  isOpen,
  onToggleOpen,
}: AICopilotProps) {
  // 모드: 'current' (현재 문서 질문) | 'all' (전체 아카이브 검색)
  const [mode, setMode] = useState<'current' | 'all'>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! 저는 수집된 지식을 바탕으로 사실에 근거하여 답변하는 **세컨드 브레인 코파일럿**입니다. 현재 문서 또는 전체 아카이브에서 궁금한 점을 질문해보세요.',
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 문서가 변경될 때 모드 조정
  useEffect(() => {
    if (currentDocument) {
      setMode('current');
    } else {
      setMode('all');
    }
  }, [currentDocument]);

  // 스크롤 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userQuestion,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const filterDocId = mode === 'current' && currentDocument ? currentDocument.id : null;
      
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          filter_doc_id: filterDocId,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '답변 생성 실패');
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 답변 텍스트 내의 [문서ID|문서제목|페이지번호] 마커를
   * 클릭 가능한 각주 배지로 인터랙티브하게 변환합니다.
   */
  const renderFormattedAnswer = (text: string) => {
    const citationRegex = /\[([0-9a-fA-F-]{36})\|([^\|\]]+)\|([0-9]*)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // 마커 이전의 일반 텍스트 추가
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const docId = match[1];
      const title = match[2];
      const pageStr = match[3];
      const pageText = pageStr ? `, p.${pageStr}` : '';

      // 클릭 가능한 각주 배지 생성
      parts.push(
        <button
          key={`${docId}-${matchIndex}`}
          onClick={() => onNavigateToDoc(docId)}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-[11px] font-medium transition-colors align-baseline"
          title={`클릭하여 '${title}' 문서 열기`}
        >
          <BookOpen className="w-2.5 h-2.5 opacity-80" />
          <span>{title}{pageText}</span>
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    // 남은 텍스트 추가
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // 패널이 접혀있는 상태
  if (!isOpen) {
    return (
      <div className="h-screen bg-surface border-l border-border flex flex-col items-center py-4 px-2 select-none">
        <button
          onClick={onToggleOpen}
          className="p-2 rounded-xl bg-surface-elevated hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow-md"
          title="AI 코파일럿 열기"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-[360px] flex-shrink-0 bg-surface border-l border-border h-screen flex flex-col select-none">
      {/* 상단 헤더 & 접기 버튼 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">AI 코파일럿</h3>
            <p className="text-[10px] text-slate-400">RAG 지식 검색 허브</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-elevated transition-colors"
            title="대화 내역 비우기"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
            title="패널 접기"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 모드 탭 (현재 문서 vs 전체 아카이브) */}
      <div className="px-3 pt-3 pb-2 border-b border-border flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1 bg-background p-1 rounded-xl border border-border">
          <button
            onClick={() => setMode('current')}
            disabled={!currentDocument}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'current'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>현재 문서 질문</span>
          </button>
          <button
            onClick={() => setMode('all')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>전체 아카이브</span>
          </button>
        </div>

        {mode === 'current' && currentDocument && (
          <div className="flex items-center gap-1 px-2 py-1 bg-surface-elevated/70 rounded-lg text-[10px] text-indigo-300 border border-border/80">
            <span className="font-semibold text-slate-400">대상:</span>
            <span className="truncate">{currentDocument.title}</span>
          </div>
        )}
      </div>

      {/* 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-surface-elevated text-slate-200 border border-border rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {renderFormattedAnswer(m.content)}
                  </div>
                )}
              </div>

              {/* 답변 하단 출처(Citation) 배지 목록 */}
              {!isUser && m.citations && m.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 max-w-[92%]">
                  {m.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onNavigateToDoc(c.docId)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated hover:bg-slate-800 text-[10px] text-indigo-300 border border-border transition-colors"
                    >
                      <BookOpen className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[120px]">{c.title}</span>
                      {c.page && <span className="text-slate-400 font-mono">p.{c.page}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-surface-elevated p-3 rounded-2xl rounded-tl-none border border-border w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>아카이브에서 관련 사실을 검색하고 답변을 생성하는 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-3 border-t border-border bg-surface/60">
        <form onSubmit={handleSendMessage} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={
              mode === 'current' && currentDocument
                ? `'${currentDocument.title}'에 대해 질문...`
                : '아카이브의 모든 지식에 대해 질문...'
            }
            rows={2}
            disabled={loading}
            className="w-full pl-3 pr-10 py-2 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 bottom-3.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
            title="전송"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          검색된 출처 기반으로만 답변하며, 인용 버튼을 누르면 해당 문서로 이동합니다.
        </p>
      </div>
    </aside>
  );
}
