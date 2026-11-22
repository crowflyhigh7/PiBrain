import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ParsedWebContent {
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
}

export async function parseWebArticle(url: string): Promise<ParsedWebContent> {
  // 1. URL 유효성 검사
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw new Error('http 또는 https 프로토콜만 지원합니다.');
    }
  } catch {
    throw new Error('유효하지 않은 URL 형식입니다.');
  }

  // 2. 10초 타임아웃 AbortController 구성
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PiBrain-PKM/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('웹 페이지 요청 시간이 초과되었습니다 (10초 타임아웃). 사이트 상태를 확인해주세요.');
    }
    throw new Error(`웹 페이지에 연결할 수 없습니다: ${err instanceof Error ? err.message : '알 수 없는 네트워크 오류'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('해당 웹사이트에서 접근을 거부했습니다 (403 Forbidden). 브라우저에서 직접 본문을 복사하여 메모로 추가해주세요.');
    }
    if (response.status === 404) {
      throw new Error('요청한 웹 페이지를 찾을 수 없습니다 (404 Not Found). URL을 확인해주세요.');
    }
    throw new Error(`웹 페이지를 불러오지 못했습니다 (HTTP ${response.status} ${response.statusText}).`);
  }

  const html = await response.text();
  if (!html || html.trim().length === 0) {
    throw new Error('웹 페이지의 내용이 비어 있습니다.');
  }

  // 3. JSDOM 및 Readability를 통한 본문 추출
  try {
    const dom = new JSDOM(html, { url: targetUrl.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length === 0) {
      // Readability 추출 실패 시 body 텍스트 기본 fallback
      const bodyText = dom.window.document.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const docTitle = dom.window.document.title || targetUrl.hostname;
      if (bodyText.length < 50) {
        throw new Error('웹 페이지 본문 텍스트를 추출할 수 없습니다. 내용이 동적으로 로드되는 사이트일 수 있습니다.');
      }
      return {
        title: docTitle,
        content: bodyText,
      };
    }

    return {
      title: article.title || dom.window.document.title || '제목 없음',
      content: article.textContent.replace(/\n\s*\n/g, '\n\n').trim(),
      excerpt: article.excerpt || undefined,
      byline: article.byline || undefined,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('추출할 수 없습니다')) {
      throw err;
    }
    throw new Error(`HTML 파싱 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '파싱 에러'}`);
  }
}
