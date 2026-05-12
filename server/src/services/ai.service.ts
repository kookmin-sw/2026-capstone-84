import axios from 'axios';
import { readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';

const getApiKey = () => process.env.GEMINI_API_KEY || '';
const getModel = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AppError(500, 'AI_NOT_CONFIGURED', 'Gemini API 키가 설정되지 않았습니다');
  }

  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  }, { timeout: 30000 });

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export const aiService = {
  async suggestTopics(groupId: string): Promise<{ topics: { title: string; content: string }[] }> {
    const group = await readerPrisma.group.findUnique({
      where: { id: groupId },
      include: {
        book: true,
        memos: {
          where: { OR: [{ visibility: 'public' }, { visibility: 'spoiler' }, { isPublic: true }] },
          select: { content: true, pageStart: true, pageEnd: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');

    const memoSummary = group.memos.length > 0
      ? group.memos.map(m => `[p.${m.pageStart}-${m.pageEnd}] ${m.content.slice(0, 200)}`).join('\n')
      : '(공유된 메모 없음)';

    const systemPrompt = `당신은 독서 토론 진행자입니다. 책 정보와 참여자들의 메모를 바탕으로 깊이 있는 토론 주제를 제안해주세요. 반드시 JSON 배열 형식으로만 응답하세요.`;
    const userPrompt = `책 제목: ${group.book.title}
저자: ${group.book.author || '미상'}
줄거리: ${group.book.summary || '없음'}

참여자 메모:
${memoSummary}

위 정보를 바탕으로 토론 주제 3개를 제안해주세요.
응답 형식 (JSON 배열만):
[{"title": "주제 제목", "content": "주제에 대한 설명과 토론 방향 제시"}]`;

    const raw = await callGemini(systemPrompt, userPrompt);
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const topics = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return { topics };
    } catch {
      return { topics: [{ title: 'AI 추천 토론', content: raw }] };
    }
  },

  async summarizeThread(discussionId: string): Promise<{ summary: string }> {
    const discussion = await readerPrisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        author: { select: { nickname: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { nickname: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { author: { select: { nickname: true } } },
            },
          },
        },
      },
    });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '토론을 찾을 수 없습니다');

    const thread: string[] = [];
    thread.push(`[주제] ${discussion.title}`);
    if (discussion.content) thread.push(`[설명] ${discussion.content}`);
    for (const comment of discussion.comments) {
      thread.push(`${comment.author.nickname}: ${comment.content}`);
      for (const reply of comment.replies) {
        thread.push(`  ↳ ${reply.author.nickname}: ${reply.content}`);
      }
    }

    const systemPrompt = `당신은 독서 토론 정리 도우미입니다. 토론 내용을 핵심 위주로 정리해주세요. 마크다운 형식으로 작성하세요.`;
    const userPrompt = `다음 토론 스레드를 정리해주세요:

${thread.join('\n')}

다음 형식으로 정리해주세요:
## 핵심 논점
- 주요 논점들

## 주요 의견
- 참여자별 핵심 의견

## 결론 및 인사이트
- 토론에서 도출된 인사이트`;

    const summary = await callGemini(systemPrompt, userPrompt);
    return { summary };
  },

  async generateInsight(groupId: string, userId: string): Promise<{ insight: string }> {
    const group = await readerPrisma.group.findUnique({
      where: { id: groupId },
      include: {
        book: true,
        members: { include: { user: { select: { nickname: true } } } },
      },
    });
    if (!group) throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');

    const myMemos = await readerPrisma.memo.findMany({
      where: { groupId, userId },
      orderBy: { pageStart: 'asc' },
      select: { content: true, pageStart: true, pageEnd: true },
    });

    const discussions = await readerPrisma.discussion.findMany({
      where: { groupId },
      include: {
        comments: {
          include: {
            author: { select: { nickname: true } },
            replies: { include: { author: { select: { nickname: true } } } },
          },
        },
      },
    });

    const memoText = myMemos.length > 0
      ? myMemos.map(m => `[p.${m.pageStart}-${m.pageEnd}] ${m.content.slice(0, 300)}`).join('\n')
      : '(작성한 메모 없음)';

    const discussionText = discussions.map(d => {
      const commentCount = d.comments.length;
      const replyCount = d.comments.reduce((sum, c) => sum + c.replies.length, 0);
      return `- ${d.title} (의견 ${commentCount}개, 댓글 ${replyCount}개)`;
    }).join('\n') || '(토론 없음)';

    const systemPrompt = `당신은 독서 모임 회고 도우미입니다. 사용자의 메모와 모임 토론 내용을 바탕으로 개인화된 독서 인사이트를 정리해주세요. 마크다운 형식으로 작성하세요.`;
    const userPrompt = `책: ${group.book.title} (${group.book.author || '미상'})
독서 기간: ${group.readingStartDate.toISOString().slice(0, 10)} ~ ${group.readingEndDate.toISOString().slice(0, 10)}
참여자: ${group.members.map(m => m.user.nickname).join(', ')}

내 메모:
${memoText}

모임 토론:
${discussionText}

위 내용을 바탕으로 다음을 정리해주세요:
## 📖 독서 요약
- 이 책에서 내가 주목한 부분들

## 💡 핵심 인사이트
- 메모와 토론에서 얻은 인사이트

## 🔄 성장 포인트
- 이 독서를 통해 얻은 것들

## 📌 기억할 문장/생각
- 인상 깊었던 내용`;

    const insight = await callGemini(systemPrompt, userPrompt);
    return { insight };
  },
};
