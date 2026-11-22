import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경 변수 기반 Provider 선택
const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const openaiKey = process.env.OPENAI_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

// OpenAI 클라이언트 초기화
let openaiClient: OpenAI | null = null;
if (openaiKey) {
  openaiClient = new OpenAI({
    apiKey: openaiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

// Gemini 클라이언트 초기화
let geminiClient: GoogleGenerativeAI | null = null;
if (geminiKey) {
  geminiClient = new GoogleGenerativeAI(geminiKey);
}

export interface SummaryAndTagsResult {
  summary: string;
  tags: string[];
}

/**
 * 문서 본문으로부터 핵심 3줄 요약과 3~5개 태그를 생성합니다.
 */
export async function generateSummaryAndTags(
  content: string,
  title?: string
): Promise<SummaryAndTagsResult> {
  const truncatedContent = content.slice(0, 12000); // 토큰 한도 방어
  const prompt = `당신은 PKM(개인 지식 관리) 전문 AI 어시스턴트입니다.
아래 제공된 문서를 면밀히 분석하여:
1. 문서의 핵심 요점을 3줄(간결하고 정보 밀도 높은 문장, 한국어)로 요약하세요.
2. 문서를 분류하고 지식 그래프로 연결할 수 있는 핵심 키워드 태그 3~5개를 추출하세요 (한글/영문 가능, 공백 없는 단일 키워드).

반드시 다음 JSON 포맷으로만 응답하세요. 마크다운이나 기타 텍스트는 포함하지 마세요.
{
  "summary": "1. 첫 번째 핵심 요약\\n2. 두 번째 핵심 요약\\n3. 세 번째 핵심 요약",
  "tags": ["키워드1", "키워드2", "키워드3", "키워드4"]
}

문서 제목: ${title || '제목 없음'}
문서 본문:
${truncatedContent}`;

  // 1. OpenAI 사용
  if (provider === 'openai' || !geminiKey) {
    if (!openaiClient) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local을 확인해주세요.');
    }

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional knowledge management assistant. Respond strictly in valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    try {
      const parsed = JSON.parse(resultText);
      return {
        summary: parsed.summary || '요약을 생성할 수 없습니다.',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      };
    } catch {
      return {
        summary: resultText.slice(0, 300),
        tags: ['지식', '아카이브'],
      };
    }
  }

  // 2. Gemini 사용 fallback
  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const model = geminiClient.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary || '요약을 생성할 수 없습니다.',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    };
  } catch {
    return {
      summary: text.slice(0, 300),
      tags: ['지식', '아카이브'],
    };
  }
}

/**
 * 텍스트 임베딩을 생성합니다 (1536차원 벡터).
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const sanitizedText = text.replace(/\n+/g, ' ').trim().slice(0, 8000);

  if (provider === 'openai' || !geminiKey) {
    if (!openaiClient) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: sanitizedText,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  }

  // Gemini Embedding Fallback (text-embedding-004)
  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const model = geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(sanitizedText);
  let values = result.embedding.values;

  // pgvector 스키마가 1536차원으로 고정되어 있으므로 768차원일 경우 1536으로 패딩
  if (values.length < 1536) {
    const padded = new Array(1536).fill(0);
    for (let i = 0; i < values.length; i++) {
      padded[i] = values[i];
    }
    return padded;
  }
  return values.slice(0, 1536);
}

/**
 * 여러 텍스트의 임베딩을 일괄 생성합니다.
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (provider === 'openai' || !geminiKey) {
    if (!openaiClient) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const sanitizedTexts = texts.map((t) => t.replace(/\n+/g, ' ').trim().slice(0, 8000));
    
    // 배치 크기 100개 단위로 분할 요청
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < sanitizedTexts.length; i += batchSize) {
      const batch = sanitizedTexts.slice(i, i + batchSize);
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        dimensions: 1536,
      });

      for (const item of response.data) {
        allEmbeddings.push(item.embedding);
      }
    }

    return allEmbeddings;
  }

  // Gemini 순차 호출
  const results: number[][] = [];
  for (const t of texts) {
    results.push(await createEmbedding(t));
  }
  return results;
}

/**
 * RAG 질의응답 생성
 */
export async function generateChatAnswer(
  systemPrompt: string,
  userQuestion: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  if (provider === 'openai' || !geminiKey) {
    if (!openaiClient) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userQuestion },
    ];

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1, // 사실 기반 응답을 위해 낮은 temperature
    });

    return response.choices[0]?.message?.content || '답변을 생성할 수 없습니다.';
  }

  // Gemini chat fallback
  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const model = geminiClient.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
  });

  const result = await chat.sendMessage(userQuestion);
  return result.response.text();
}
