import { PrismaClient } from '@prisma/client';
import { AppError } from './auth.service';
import { CreateDiscussionInput, CreateCommentInput } from '../validators';

const prisma = new PrismaClient();

export interface RecommendedTopic {
  title: string;
  content: string;
  keywords: string[];
  memoIds: string[];
}

export const discussionService = {
  async createTopic(groupId: string, userId: string, data: CreateDiscussionInput) {
    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 토론 주제를 생성할 수 있습니다');
    }

    // If memoId is provided, verify it exists and belongs to this group
    if (data.memoId) {
      const memo = await prisma.memo.findUnique({ where: { id: data.memoId } });
      if (!memo) {
        throw new AppError(404, 'NOT_FOUND', '참조할 메모를 찾을 수 없습니다');
      }
      if (memo.groupId !== groupId) {
        throw new AppError(400, 'VALIDATION_ERROR', '해당 모임의 메모만 참조할 수 있습니다');
      }
    }

    const discussion = await prisma.discussion.create({
      data: {
        groupId,
        authorId: userId,
        memoId: data.memoId ?? null,
        title: data.title,
        content: data.content ?? null,
        isRecommended: false,
      },
      include: {
        author: { select: { id: true, nickname: true } },
        memo: true,
      },
    });

    return discussion;
  },

  async getById(discussionId: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        author: { select: { id: true, nickname: true } },
        memo: { select: { id: true, content: true, pageStart: true, pageEnd: true } },
      },
    });
    if (!discussion) {
      throw new AppError(404, 'NOT_FOUND', '토론 주제를 찾을 수 없습니다');
    }
    return {
      ...discussion,
      authorNickname: discussion.author.nickname,
    };
  },

  async listTopics(groupId: string, filter?: { authorId?: string }) {
    const where: any = { groupId };
    if (filter?.authorId) {
      where.authorId = filter.authorId;
    }

    const discussions = await prisma.discussion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, nickname: true } },
        memo: { select: { id: true, content: true, pageStart: true, pageEnd: true } },
        _count: { select: { comments: true } },
      },
    });

    return discussions.map((d: typeof discussions[number]) => ({
      id: d.id,
      groupId: d.groupId,
      authorId: d.authorId,
      memoId: d.memoId,
      title: d.title,
      content: d.content,
      isRecommended: d.isRecommended,
      createdAt: d.createdAt,
      author: d.author,
      memo: d.memo,
      commentCount: d._count.comments,
    }));
  },

  async addComment(discussionId: string, userId: string, content: string) {
    // Verify discussion exists
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
    });
    if (!discussion) {
      throw new AppError(404, 'NOT_FOUND', '토론 주제를 찾을 수 없습니다');
    }

    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: discussion.groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 의견을 작성할 수 있습니다');
    }

    const comment = await prisma.comment.create({
      data: {
        discussionId,
        authorId: userId,
        content,
      },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });

    return comment;
  },

  async addReply(commentId: string, userId: string, content: string) {
    // Verify comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { discussion: true },
    });
    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', '의견을 찾을 수 없습니다');
    }

    // Verify user is a member of the group
    const groupId = comment.discussion?.groupId;
    if (!groupId) {
      throw new AppError(400, 'VALIDATION_ERROR', '해당 의견의 토론 정보를 찾을 수 없습니다');
    }
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 댓글을 작성할 수 있습니다');
    }

    const reply = await prisma.reply.create({
      data: {
        commentId,
        authorId: userId,
        content,
      },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });

    return reply;
  },

  async getComments(discussionId: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
    });
    if (!discussion) {
      throw new AppError(404, 'NOT_FOUND', '토론 주제를 찾을 수 없습니다');
    }

    const comments = await prisma.comment.findMany({
      where: { discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, nickname: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, nickname: true } },
          },
        },
      },
    });

    return comments;
  },

  async getRecommendations(groupId: string): Promise<RecommendedTopic[]> {
    // Fetch public memos in this group
    const publicMemos = await prisma.memo.findMany({
      where: { groupId, isPublic: true },
      select: { id: true, content: true },
    });

    // Require at least 2 public memos for recommendations
    if (publicMemos.length < 2) {
      return [];
    }

    // Simple keyword-based recommendation engine
    // Extract keywords from memo contents and generate topic candidates
    const keywordMap = new Map<string, { count: number; memoIds: string[] }>();

    for (const memo of publicMemos) {
      const words = extractKeywords(memo.content);
      for (const word of words) {
        const entry = keywordMap.get(word) || { count: 0, memoIds: [] };
        entry.count++;
        if (!entry.memoIds.includes(memo.id)) {
          entry.memoIds.push(memo.id);
        }
        keywordMap.set(word, entry);
      }
    }

    // Find keywords that appear in multiple memos
    const sharedKeywords = Array.from(keywordMap.entries())
      .filter(([, v]) => v.memoIds.length >= 2)
      .sort((a, b) => b[1].count - a[1].count);

    const recommendations: RecommendedTopic[] = [];

    if (sharedKeywords.length > 0) {
      // Generate topics from shared keywords (up to 3)
      const topKeywords = sharedKeywords.slice(0, 3);
      for (const [keyword, data] of topKeywords) {
        recommendations.push({
          title: `'${keyword}'에 대한 토론`,
          content: `여러 참여자가 '${keyword}'에 대해 메모를 남겼습니다. 이 주제에 대해 토론해보세요.`,
          keywords: [keyword],
          memoIds: data.memoIds,
        });
      }
    } else {
      // Fallback: generate a general topic from all public memos
      recommendations.push({
        title: '공유된 메모 기반 토론',
        content: '참여자들이 공유한 메모를 바탕으로 자유롭게 토론해보세요.',
        keywords: [],
        memoIds: publicMemos.map((m: { id: string; content: string }) => m.id),
      });
    }

    return recommendations;
  },

  async createFromRecommendation(groupId: string, userId: string, recommendation: RecommendedTopic) {
    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 토론 주제를 생성할 수 있습니다');
    }

    const discussion = await prisma.discussion.create({
      data: {
        groupId,
        authorId: userId,
        title: recommendation.title,
        content: recommendation.content,
        isRecommended: true,
        memoId: recommendation.memoIds.length > 0 ? recommendation.memoIds[0] : null,
      },
      include: {
        author: { select: { id: true, nickname: true } },
        memo: true,
      },
    });

    return discussion;
  },
};

function extractKeywords(text: string): string[] {
  // Simple Korean/English keyword extraction
  // Remove common particles and short words, keep meaningful terms
  const words = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .map(w => w.toLowerCase());

  // Remove very common Korean particles/suffixes
  const stopWords = new Set([
    '이', '가', '은', '는', '을', '를', '의', '에', '에서', '로', '으로',
    '와', '과', '도', '만', '까지', '부터', '에게', '한테', '께',
    '하다', '되다', '있다', '없다', '이다', '아니다',
    '그', '이', '저', '것', '수', '등', '때', '더', '또',
    'the', 'is', 'at', 'in', 'on', 'and', 'or', 'to', 'of', 'for', 'a', 'an',
  ]);

  return words.filter(w => !stopWords.has(w));
}
