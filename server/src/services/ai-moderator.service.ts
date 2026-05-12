import axios from 'axios';
import { writerPrisma } from '../lib/prisma';

export interface ModerationResult {
  isSuspicious: boolean;
  reason?: string;
  confidence: number;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `당신은 콘텐츠 모더레이션 전문가입니다. 게시글 내용을 검토하여 부적절한 콘텐츠(스팸, 혐오 발언, 음란물, 폭력적 내용, 광고성 글 등)가 포함되어 있는지 판단해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{"isSuspicious": true/false, "reason": "의심 사유 (부적절한 경우에만)", "confidence": 0.0~1.0}

- isSuspicious: 부적절한 콘텐츠가 의심되면 true, 아니면 false
- reason: isSuspicious가 true일 때만 사유를 작성 (false일 때는 빈 문자열)
- confidence: 판단 신뢰도 (0.0~1.0)`;

function buildUserPrompt(content: string): string {
  return `다음 게시글 내용을 검토해주세요:\n\n${content.slice(0, 1000)}`;
}

function parseModerationResponse(raw: string): ModerationResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const isSuspicious = Boolean(parsed.isSuspicious);
    const confidence = Number(parsed.confidence);
    const reason = parsed.reason as string | undefined;

    return {
      isSuspicious,
      reason: isSuspicious ? reason || undefined : undefined,
      confidence: Math.min(1, Math.max(0, isNaN(confidence) ? 0.5 : confidence)),
    };
  } catch {
    return null;
  }
}

export const aiModeratorService = {
  /**
   * 게시글 내용의 부적절성을 검사한다.
   * API 실패 시 오류를 로깅하고 안전한 기본값(isSuspicious: false)을 반환한다.
   */
  async checkContent(content: string): Promise<ModerationResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { isSuspicious: false, confidence: 0 };
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(content) },
          ],
          temperature: 0.1,
          max_tokens: 200,
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
      const result = parseModerationResponse(raw);

      if (!result) {
        return { isSuspicious: false, confidence: 0 };
      }

      return result;
    } catch (error) {
      console.error('[AI Moderator] API 호출 실패:', error);
      return { isSuspicious: false, confidence: 0 };
    }
  },

  /**
   * 게시글 모더레이션을 비동기로 실행한다.
   * 부적절 콘텐츠 의심 시 관리자 알림을 생성한다 (게시글을 숨기지 않음).
   * 이 함수는 fire-and-forget으로 호출되어 게시글 작성 응답을 지연시키지 않는다.
   */
  async moderatePost(postId: string, content: string): Promise<void> {
    try {
      const result = await this.checkContent(content);

      if (result.isSuspicious) {
        // 관리자 알림 생성 (Notification 테이블에 직접 저장)
        // recipientId는 시스템 알림이므로 게시글 작성자를 대상으로 하지 않고,
        // 관리자 역할을 가진 사용자에게 전달해야 하지만,
        // 현재 User 모델에 role 필드가 없으므로 첫 번째 사용자(시스템 관리자)에게 알림을 보낸다.
        // 추후 관리자 시스템이 구현되면 개선 가능.
        const adminUser = await writerPrisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

        if (adminUser) {
          await writerPrisma.notification.create({
            data: {
              recipientId: adminUser.id,
              type: 'moderation_alert',
              title: 'AI 모더레이션 알림',
              message: `부적절한 콘텐츠 의심 (신뢰도: ${(result.confidence * 100).toFixed(0)}%): ${result.reason || '사유 없음'}`,
              linkUrl: `/community/${postId}`,
              isRead: false,
            },
          });
        }
      }
    } catch (error) {
      console.error('[AI Moderator] 모더레이션 처리 실패:', error);
    }
  },
};
