# PiBrain: AI 세컨드 브레인 (PKM & RAG 허브)

웹 기사, PDF 문서, 마크다운 메모를 통합 수집하고, AI로 자동 요약·태깅·pgvector 인덱싱하며, 지식 그래프와 출처 기반 RAG(질의응답) 코파일럿으로 연결하는 **개인 지식 관리(PKM) 웹 애플리케이션**입니다.

---

## 🚀 주요 기능

1. **다채널 통합 수집 (Web, PDF, Note)**:
   - **웹 기사**: URL 입력 시 `@mozilla/readability` + `jsdom` 엔진이 광고/배너를 제외하고 순수 본문과 제목을 정제하여 추출.
   - **PDF 문서**: `pdf-parse`를 통해 최대 25MB의 PDF 문서를 페이지별 텍스트 배열로 분할하여 청크에 `page_number` 매핑.
   - **개인 메모**: 아이디어와 생각을 마크다운 형식으로 작성 및 저장.
2. **AI 자동 가공 파이프라인 (`lib/ai-processor.ts`)**:
   - LLM(JSON 모드)을 통해 핵심 3줄 요약(`summary`)과 핵심 키워드 태그 3~5개(`tags`) 자동 추출.
   - 800~1,000자(오버랩 150자) 단위 시맨틱 청킹.
   - `text-embedding-3-small` (1536차원) 벡터 임베딩 생성 및 `document_chunks` 일괄 삽입.
   - 코사인 유사도 0.78 이상인 기존 문서를 감지하여 `document_links`에 자동 백링크(`auto`) 생성.
3. **데스크톱 몰입형 3-Panel UI**:
   - **좌측 사이드바 (240px)**: `+ 새 자료 추가`, 뷰 전환(`아카이브 목록` / `지식 그래프 맵`), 타입별 스마트 필터(문서 개수 뱃지), 태그 클라우드.
   - **중앙 메인 뷰 (flex-1)**:
     - **리스트 모드**: 실시간 검색바, 정렬(최신순, 연결 많은 순), 카드 그리드(요약, 태그, 백링크 수).
     - **상세 리더 모드**: 원본 링크, 삭제, 마크다운 본문 뷰어, 하단 연관 노트(Backlinks) 패널 및 수동 링크 추가/삭제.
     - **지식 그래프 모드**: `react-force-graph-2d` 캔버스 렌더링 (타입별 색상, 연결 수 비례 노드 크기, 호버 툴팁, 클릭 시 리더 모드 전환).
   - **우측 AI 코파일럿 패널 (360px, 접기/펼치기)**:
     - `[현재 문서 질문]` vs `[전체 아카이브 검색]` 탭 모드.
     - 검색된 사실에만 근거하여 답변 (추측 답변 방지).
     - 출처 각주 마커(`[문서ID|문서제목|페이지]`)를 클릭 가능한 배지로 렌더링하여 클릭 시 해당 문서로 즉시 이동.
4. **AI Provider 추상화 (`lib/ai-provider.ts`)**:
   - OpenAI API 기본 지원 및 환경 변수에 따라 Google Gemini API로 유연하게 대체 가능.

---

## 🛠️ 기술 스택

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS (Dark Mode 테마)
- **Icons**: `lucide-react`
- **Database**: Supabase (PostgreSQL + `pgvector` HNSW 확장)
- **Parsers**: `@mozilla/readability`, `jsdom`, `pdf-parse`
- **Graph Visualization**: `react-force-graph-2d`
- **AI**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) / Gemini API

---

## 📋 사전 준비 및 설정

### 1. Supabase 데이터베이스 설정
Supabase 대시보드의 **SQL Editor**에서 프로젝트 루트의 `supabase/schema.sql` 스크립트를 실행합니다.
- `pgvector` 확장 및 테이블 (`documents`, `document_chunks`, `tags`, `document_tags`, `document_links`) 생성
- HNSW 인덱스 생성
- `match_document_chunks` RPC 함수 등록

### 2. 환경 변수 설정 (`.env.local`)
`.env.example` 파일을 복사하여 `.env.local`을 작성하고 본인의 API 키를 입력합니다:

```bash
cp .env.example .env.local
```

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider 설정
OPENAI_API_KEY=your-openai-api-key
AI_PROVIDER=openai # openai 또는 gemini
```

---

## 💻 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm run start
```

브라우저에서 `http://localhost:3000`으로 접속하여 세컨드 브레인을 사용하실 수 있습니다.
