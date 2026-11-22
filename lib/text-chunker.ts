export interface ChunkResult {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
}

/**
 * 긴 단일 텍스트를 chunkSize (기본 900자), chunkOverlap (기본 150자)로 청킹합니다.
 * 문장 끝(., \n, ?, !)을 기준으로 가급적 자연스럽게 끊습니다.
 */
export function chunkText(
  text: string,
  chunkSize: number = 900,
  chunkOverlap: number = 150,
  pageNumber: number | null = null
): ChunkResult[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleaned = text.trim();
  if (cleaned.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleaned,
        pageNumber,
      },
    ];
  }

  const chunks: ChunkResult[] = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < cleaned.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleaned.length) {
      const chunk = cleaned.slice(startIndex).trim();
      if (chunk.length > 0) {
        chunks.push({
          chunkIndex: chunkIdx++,
          content: chunk,
          pageNumber,
        });
      }
      break;
    }

    // 문장 마침표나 줄바꿈 위치를 찾아 더 자연스러운 분할 지점 탐색
    let splitPoint = endIndex;
    const windowSlice = cleaned.slice(startIndex + Math.floor(chunkSize * 0.7), endIndex + 50);
    const breakMatch = windowSlice.match(/([\.\?!]\s+|\n{1,2})/g);

    if (breakMatch && breakMatch.length > 0) {
      const lastBreak = windowSlice.lastIndexOf(breakMatch[breakMatch.length - 1]);
      if (lastBreak !== -1) {
        splitPoint = startIndex + Math.floor(chunkSize * 0.7) + lastBreak + 1;
      }
    }

    const chunk = cleaned.slice(startIndex, splitPoint).trim();
    if (chunk.length > 0) {
      chunks.push({
        chunkIndex: chunkIdx++,
        content: chunk,
        pageNumber,
      });
    }

    // 다음 청크는 오버랩을 반영하여 시작
    startIndex = Math.max(splitPoint - chunkOverlap, startIndex + 1);
  }

  return chunks;
}

/**
 * PDF와 같이 페이지별 텍스트 배열을 받아 페이지 번호를 유지하며 청킹합니다.
 */
export function chunkPages(
  pages: { pageNumber: number; text: string }[],
  chunkSize: number = 900,
  chunkOverlap: number = 150
): ChunkResult[] {
  const allChunks: ChunkResult[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, chunkSize, chunkOverlap, page.pageNumber);
    for (const chunk of pageChunks) {
      allChunks.push({
        chunkIndex: globalIndex++,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
      });
    }
  }

  return allChunks;
}
