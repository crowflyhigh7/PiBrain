import { extractText, getDocumentProxy } from 'unpdf';

export interface ParsedPdfResult {
  fullText: string;
  numPages: number;
  pages: { pageNumber: number; text: string }[];
  info?: Record<string, any>;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(uint8Array);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    const pages: { pageNumber: number; text: string }[] = [];
    const textArray = Array.isArray(text) ? text : [text];

    textArray.forEach((pageText, idx) => {
      const trimmed = pageText.trim();
      if (trimmed.length > 0) {
        pages.push({
          pageNumber: idx + 1,
          text: trimmed,
        });
      }
    });

    const fullText = pages.map((p) => p.text).join('\n\n');

    return {
      fullText,
      numPages: totalPages || pages.length,
      pages,
    };
  } catch (err: unknown) {
    throw new Error(`PDF 파일 파싱에 실패했습니다: ${err instanceof Error ? err.message : '손상되었거나 암호화된 PDF일 수 있습니다.'}`);
  }
}
