'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw, 
  Globe, 
  FileText, 
  PenTool, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { GraphData, GraphNode, SourceType } from '@/types/database';

// ForceGraph2D는 브라우저 Canvas API를 사용하므로 ssr: false로 dynamic import
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
      <p className="text-xs">지식 그래프 렌더러를 초기화하는 중...</p>
    </div>
  ),
});

interface KnowledgeGraphProps {
  onSelectDocument: (docId: string) => void;
}

export default function KnowledgeGraph({ onSelectDocument }: KnowledgeGraphProps) {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 그래프 데이터 로드
  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph');
      if (res.ok) {
        const graphData = await res.json();
        setData(graphData);
      }
    } catch (err) {
      console.error('그래프 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // 컨테이너 크기 반응형 감지
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 타입별 색상 매핑
  const getNodeColor = (type: SourceType) => {
    switch (type) {
      case 'web':
        return '#3b82f6'; // 블루
      case 'pdf':
        return '#f43f5e'; // 로즈
      case 'note':
        return '#10b981'; // 에메랄드
      default:
        return '#6366f1';
    }
  };

  // 노드 커스텀 렌더링
  const handleNodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const baseRadius = Math.max(4, Math.min(16, (node.val || 4)));
    const radius = isHovered ? baseRadius * 1.3 : baseRadius;
    const color = getNodeColor(node.source_type);

    // 노드 외곽 발광 효과 (호버 시 더욱 강조)
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
      ctx.fillStyle = `${color}40`; // 25% opacity
      ctx.fill();
    }

    // 메인 원 노드
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 텍스트 라벨 (줌 인 되었거나 호버 시 표시)
    if (globalScale > 1.2 || isHovered) {
      const label = node.name || node.title;
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 라벨 배경
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.fillRect(
        node.x - textWidth / 2 - 2,
        node.y + radius + 2,
        textWidth + 4,
        fontSize + 4
      );

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, node.x, node.y + radius + 4);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 h-screen bg-background overflow-hidden flex flex-col select-none">
      {/* 상단 오버레이 헤더 & 컨트롤 */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-surface/80 backdrop-blur-md border border-border px-4 py-2.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold text-white">지식 그래프 맵</h2>
        </div>
        <div className="h-3 w-[1px] bg-border" />
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> 웹 기사
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> PDF
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 메모
          </span>
        </div>
      </div>

      {/* 우측 상단 줌/재정렬 컨트롤 */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-surface/80 backdrop-blur-md border border-border p-1 rounded-2xl shadow-lg">
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
          className="p-2 text-slate-400 hover:text-white hover:bg-surface-elevated rounded-xl transition-colors"
          title="확대"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 400)}
          className="p-2 text-slate-400 hover:text-white hover:bg-surface-elevated rounded-xl transition-colors"
          title="축소"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
          className="p-2 text-slate-400 hover:text-white hover:bg-surface-elevated rounded-xl transition-colors"
          title="화면 맞춤"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={fetchGraphData}
          className="p-2 text-slate-400 hover:text-white hover:bg-surface-elevated rounded-xl transition-colors"
          title="그래프 새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 노드 호버 툴팁 */}
      {hoverNode && (
        <div className="absolute bottom-6 left-6 z-20 max-w-sm bg-surface/95 backdrop-blur-md border border-indigo-500/40 p-4 rounded-2xl shadow-2xl animate-fade-in pointer-events-none">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getNodeColor(hoverNode.source_type) }}
            />
            <span className="text-[10px] font-semibold uppercase text-slate-400">
              {hoverNode.source_type}
            </span>
          </div>
          <h4 className="text-xs font-bold text-white mb-2 line-clamp-1">{hoverNode.title}</h4>
          {hoverNode.summary ? (
            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3 bg-background/50 p-2 rounded-lg">
              {hoverNode.summary}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">요약 내용 없음</p>
          )}
          <p className="text-[10px] text-indigo-400 mt-2 font-medium">클릭 시 상세 리더로 이동</p>
        </div>
      )}

      {/* Force Graph Canvas */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs text-slate-400">지식 그래프를 구성하는 중...</p>
        </div>
      ) : data.nodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Network className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">지식 그래프에 노드가 없습니다</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            문서를 수집하면 AI가 자동으로 내용 간의 유사도를 분석하여 지식 노드와 엣지를 연결합니다.
          </p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          backgroundColor="#090d16"
          nodeRelSize={6}
          linkColor={() => '#2e3e60'}
          linkWidth={(link: any) => (link.type === 'manual' ? 2 : 1.2)}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => '#818cf8'}
          nodeCanvasObject={handleNodeCanvasObject}
          onNodeHover={(node: any) => setHoverNode(node || null)}
          onNodeClick={(node: any) => onSelectDocument(node.id)}
          cooldownTicks={100}
        />
      )}
    </div>
  );
}
