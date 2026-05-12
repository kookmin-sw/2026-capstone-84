import axios from 'axios';
import { CATEGORY_KEYS, type CategoryKey } from '../types/community';

export interface CategoryClassificationResult {
  category: string;
  confidence: number;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `당신은 도서 카테고리 분류 전문가입니다. 책 정보(제목, 저자)와 게시글 내용을 바탕으로 가장 적합한 카테고리를 분류해주세요.

분류 가능한 카테고리:
- korean_novel: 한국 소설
- western_novel: 영미 소설
- japanese_novel: 일본 소설
- essay: 에세이
- self_help: 자기계발
- humanities: 인문학
- science: 과학
- history: 역사
- poetry: 시/시집
- other: 기타

반드시 아래 JSON 형식으로만 응답하세요:
{"category": "카테고리_키", "confidence": 0.0~1.0}`;

function buildUserPrompt(bookTitle: string, bookAuthor: string, content: string): string {
  return `책 제목: ${bookTitle}
저자: ${bookAuthor}
게시글 내용: ${content.slice(0, 500)}

위 정보를 바탕으로 가장 적합한 카테고리를 분류해주세요.`;
}

function parseClassificationResponse(raw: string): CategoryClassificationResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const category = parsed.category as string;
    const confidence = Number(parsed.confidence);

    if (!category || !CATEGORY_KEYS.includes(category as CategoryKey)) {
      return { category: 'other', confidence: confidence || 0.5 };
    }

    return {
      category,
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  } catch {
    return null;
  }
}

export const aiClassifierService = {
  async classifyCategory(
    bookTitle: string,
    bookAuthor: string,
    content: string,
  ): Promise<CategoryClassificationResult | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(bookTitle, bookAuthor, content) },
          ],
          temperature: 0.3,
          max_tokens: 100,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000,
        },
      );

      const raw = response.data?.choices?.[0]?.message?.content || '';
      return parseClassificationResponse(raw);
    } catch {
      return null;
    }
  },
};
