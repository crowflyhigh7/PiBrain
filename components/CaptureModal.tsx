'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Globe, 
  FileText, 
  PenTool, 
  UploadCloud, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Link2
} from 'lucide-react';
import { SourceType } from '@/types/database';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: any) => void;
}

export default function CaptureModal({ isOpen, onClose, onSuccess }: CaptureModalProps) {
  const [tab, setTab] = useState<SourceType>('web');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Web 폼 상태
  const [webUrl, setWebUrl] = useState('');
  const [webTitle, setWebTitle] = useState('');

  // PDF 폼 상태
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note 폼 상태
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setWebUrl('');
    setWebTitle('');
    setPdfFile(null);
    setPdfTitle('');
    setNoteTitle('');
    setNoteContent('');
    setError(null);
    setLoading(false);
    setLoadingStage('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('PDF 형식의 파일만 업로드할 수 있습니다.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError('파일 크기가 25MB를 초과합니다.');
        return;
      }
      setError(null);
      setPdfFile(file);
      if (!pdfTitle) {
        setPdfTitle(file.name.replace(/\.pdf$/i, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res: Response;

      if (tab === 'web') {
        if (!webUrl.trim()) {
          throw new Error('웹 기사 URL을 입력해주세요.');
        }
        setLoadingStage('웹 기사 본문 추출 및 정제 중...');
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'web',
            url: webUrl.trim(),
            title: webTitle.trim() || undefined,
          }),
        });
      } else if (tab === 'pdf') {
        if (!pdfFile) {
          throw new Error('PDF 파일을 선택해주세요.');
        }
        setLoadingStage('PDF 텍스트 분석 및 페이지별 파싱 중...');
        const formData = new FormData();
        formData.append('file', pdfFile);
        if (pdfTitle.trim()) {
          formData.append('title', pdfTitle.trim());
        }

        res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
      } else {
        // note
        if (!noteTitle.trim()) {
          throw new Error('메모 제목을 입력해주세요.');
        }
        if (!noteContent.trim()) {
          throw new Error('메모 본문 내용을 입력해주세요.');
        }
        setLoadingStage('마크다운 메모 AI 인덱싱 중...');
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'note',
            title: noteTitle.trim(),
            content: noteContent.trim(),
          }),
        });
      }

      setLoadingStage('AI 핵심 3줄 요약, 태그 생성 및 벡터 임베딩 처리 중...');

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '자료 등록 중 오류가 발생했습니다.');
      }

      setLoadingStage('완료! 지식 그래프에 등록되었습니다.');
      setTimeout(() => {
        onSuccess(data.document);
        resetForm();
        onClose();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">새 지식 자료 수집</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="px-6 pt-3 border-b border-border flex gap-2">
          <button
            type="button"
            onClick={() => { setTab('web'); setError(null); }}
            disabled={loading}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              tab === 'web'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>웹 기사 수집</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('pdf'); setError(null); }}
            disabled={loading}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              tab === 'pdf'
                ? 'border-rose-500 text-rose-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF 문서 업로드</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('note'); setError(null); }}
            disabled={loading}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all ${
              tab === 'note'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>개인 마크다운 메모</span>
          </button>
        </div>

        {/* 모달 폼 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">오류 발생</p>
                <p className="mt-0.5 text-slate-300">{error}</p>
                {tab === 'web' && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    💡 스크래핑이 차단된 사이트는 본문을 복사하여 <b>'개인 마크다운 메모'</b> 탭에서 직접 붙여넣으실 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1. 웹 기사 폼 */}
          {tab === 'web' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  웹 기사 URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    required
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Readability 엔진이 광고와 불필요한 배너를 제외하고 본문 텍스트만 깔끔하게 추출합니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  문서 제목 (선택)
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="비워두면 웹 페이지의 제목을 자동으로 가져옵니다"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* 2. PDF 업로드 폼 */}
          {tab === 'pdf' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  PDF 파일 선택 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    pdfFile
                      ? 'border-indigo-500/50 bg-indigo-500/5'
                      : 'border-border hover:border-slate-500 bg-background/50'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  {pdfFile ? (
                    <div>
                      <p className="text-xs font-medium text-indigo-300">{pdfFile.name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • 클릭하여 파일 변경
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-300 font-medium">클릭하거나 파일을 드래그하여 업로드</p>
                      <p className="text-[11px] text-slate-400 mt-1">최대 25MB의 텍스트 기반 PDF 문서</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  문서 제목
                </label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="파일명이 기본 제목으로 지정됩니다"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* 3. 메모 작성 폼 */}
          {tab === 'note' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  메모 제목 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="메모의 제목을 입력하세요"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  마크다운 본문 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="생각, 아이디어, 요약 내용을 자유롭게 마크다운으로 작성하세요..."
                  rows={8}
                  required
                  disabled={loading}
                  className="w-full p-3 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors font-mono resize-none"
                />
              </div>
            </div>
          )}

          {/* 로딩 진행 알림 */}
          {loading && (
            <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{loadingStage || 'AI 처리 중...'}</span>
            </div>
          )}

          {/* 폼 하단 액션 */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-surface-elevated transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>수집 및 가공 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>세컨드 브레인에 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
