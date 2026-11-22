import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PiBrain | AI 세컨드 브레인 & 지식 그래프',
  description: '웹 기사, PDF, 마크다운 메모를 수집하고 AI 지식 그래프 및 RAG 코파일럿으로 연결하는 개인 지식 관리 허브',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-background text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
