import pdfParse from 'pdf-parse';

export interface ParsedPdfResult {
  fullText: string;
  numPages: number;
  pages: { pageNumber: number; text: string }[];
  info?: Record<string, any>;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  const pages: { pageNumber: number; text: string }[] = [];
  let currentPage = 1;

  // 페이지별 텍스트를 인터셉트하는 커스텀 렌더러
  const customPagerender = async (pageData: any) => {
    const textContent = await pageData.getTextContent();
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items) {
      if (lastY === item.transform[5] || lastY === null) {
        pageText += item.str + ' ';
      } else {
        pageText += '\n' + item.str + ' ';
      }
      lastY = item.transform[5];
    }

    const trimmed = pageText.trim();
    if (trimmed.length > 0) {
      pages.push({
        pageNumber: currentPage++,
        text: trimmed,
      });
    } else {
      currentPage++;
    }

    return pageText;
  };

  try {
    const data = await pdfParse(buffer, {
      pagerender: customPagerender,
    });

    // 만약 customPagerender에서 페이지 분할이 안 된 경우 form feed 기준 fallback
    if (pages.length === 0 && data.text) {
      const splitByFormFeed = data.text.split(/\f/g);
      splitByFormFeed.forEach((pageContent, idx) => {
        const trimmed = pageContent.trim();
        if (trimmed.length > 0) {
          pages.push({
            pageNumber: idx + 1,
            text: trimmed,
          });
        }
      });
    }

    // 여전히 비어있다면 전체 텍스트 1페이지로 할당
    if (pages.length === 0 && data.text.trim().length > 0) {
      pages.push({
        pageNumber: 1,
        text: data.text.trim(),
      });
    }

    return {
      fullText: data.text.trim(),
      numPages: data.numpages || pages.length,
      pages,
      info: data.info,
    };
  } catch (err: unknown) {
    throw new Error(`PDF 파일 파싱에 실패했습니다: ${err instanceof Error ? err.message : '손상되었거나 암호화된 PDF일 수 있습니다.'}`);
  }
}
