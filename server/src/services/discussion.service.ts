import { PrismaClient } from '@prisma/client';
import { AppError } from './auth.service';
import { CreateDiscussionInput, CreateCommentInput } from '../validators';
import { tokenService } from './token.service';
import { generateInsightOnThreadClose } from './insight.service';
import { assertReadingPeriodOpen } from './reading-period.service';
import { profanityService } from './profanity.service';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export interface RecommendedTopic {
  title: string;
  content: string;
  keywords: string[];
  memoIds: string[];
}

export const discussionService = {
  async createTopic(groupId: string, userId: string, data: CreateDiscussionInput, imageUrl?: string) {
    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 토론 주제를 생성할 수 있습니다');
    }
    assertReadingPeriodOpen(member.group.readingStartDate, member.group.readingEndDate);

    // 일일 생성 횟수 제한 (모임별 3회, KST 기준)
    const todayCount = await this.getTodayCreateCount(groupId, userId);
    if (todayCount >= 3) {
      throw new AppError(429, 'DAILY_LIMIT_EXCEEDED', '오늘 생성 가능한 횟수를 초과했습니다. 내일 다시 시도해 주세요.');
    }

    // 욕설 필터링
    const titleCheck = profanityService.check(data.title);
    const contentCheck = data.content ? profanityService.check(data.content) : { isClean: true, matched: [] };
    if (!titleCheck.isClean || !contentCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
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

    // 종료일이 독서기간을 초과하는지 검증
    if (data.endDate) {
      const endDate = new Date(data.endDate);
      endDate.setHours(23, 59, 59, 999);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (endDate <= today) {
        throw new AppError(400, 'END_DATE_TOO_EARLY', '스레드 종료일은 내일 이후로 설정해야 합니다');
      }
      const readingEnd = new Date(member.group.readingEndDate);
      readingEnd.setHours(23, 59, 59, 999);
      if (endDate > readingEnd) {
        throw new AppError(400, 'END_DATE_EXCEEDS_READING_PERIOD', '스레드 종료일은 독서기간 종료일을 초과할 수 없습니다');
      }
    }

    const discussion = await prisma.discussion.create({
      data: {
        groupId,
        authorId: userId,
        memoId: data.memoId ?? null,
        title: data.title,
        content: data.content ?? null,
        imageUrl: imageUrl ?? null,
        isRecommended: false,
        status: 'active',
        endDate: data.endDate ? (() => { const d = new Date(data.endDate); d.setHours(23, 59, 59, 999); return d; })() : null,
      },
      include: {
        author: { select: { id: true, nickname: true } },
        memo: true,
      },
    });

    // 활동 점수 추가
    const { activityService } = await import('./activity.service');
    await activityService.addPoint(userId, 'thread', groupId);
    await notificationService.notifyThreadCreated(discussion.id);

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

  async listTopics(groupId: string, filter?: { authorId?: string; status?: string; participantId?: string }) {
    // 종료일 지난 active 스레드를 자동 종료 처리
    const closedThreads = await prisma.discussion.findMany({
      where: {
        groupId,
        status: 'active',
        endDate: { not: null, lt: new Date() },
      },
      select: { id: true },
    });

    if (closedThreads.length > 0) {
      await prisma.discussion.updateMany({
        where: {
          id: { in: closedThreads.map(t => t.id) },
        },
        data: { status: 'closed' },
      });

      // 종료된 스레드에 대해 비동기로 인사이트 생성 (응답 차단 안 함)
      for (const thread of closedThreads) {
        notificationService.notifyThreadEnded(thread.id).catch(() => {});
        generateInsightOnThreadClose(thread.id).catch(() => {});
      }
    }

    const where: any = { groupId };
    if (filter?.authorId) {
      where.authorId = filter.authorId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.participantId) {
      // 내가 의견/댓글을 남긴 스레드 (작성자 제외)
      where.authorId = { not: filter.participantId };
      where.OR = [
        { comments: { some: { authorId: filter.participantId } } },
        { comments: { some: { replies: { some: { authorId: filter.participantId } } } } },
      ];
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
      imageUrl: (d as any).imageUrl,
      isRecommended: d.isRecommended,
      isPinned: (d as any).isPinned,
      status: (d as any).status,
      endDate: (d as any).endDate,
      createdAt: d.createdAt,
      author: d.author,
      memo: d.memo,
      commentCount: d._count.comments,
    }));
  },

  async addComment(discussionId: string, userId: string, content: string, imageUrl?: string) {
    // Verify discussion exists
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!discussion) {
      throw new AppError(404, 'NOT_FOUND', '토론 주제를 찾을 수 없습니다');
    }

    // 종료된 스레드에는 의견 작성 불가
    if (discussion.status === 'closed') {
      throw new AppError(403, 'THREAD_CLOSED', '종료된 스레드에는 의견을 작성할 수 없습니다');
    }

    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: discussion.groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 의견을 작성할 수 있습니다');
    }
    assertReadingPeriodOpen(discussion.group.readingStartDate, discussion.group.readingEndDate);

    // 발언권 차감
    await tokenService.consume(discussionId, userId);

    // 욕설 필터링
    const commentCheck = profanityService.check(content);
    if (!commentCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    const comment = await prisma.comment.create({
      data: {
        discussionId,
        authorId: userId,
        content,
        imageUrl: imageUrl ?? null,
      },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });

    // 활동 점수 추가
    const { activityService } = await import('./activity.service');
    await activityService.addPoint(userId, 'comment', discussion.groupId);

    return comment;
  },

  async addReply(commentId: string, userId: string, content: string) {
    // Verify comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { discussion: { include: { group: { select: { readingStartDate: true, readingEndDate: true } } } } },
    });
    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', '의견을 찾을 수 없습니다');
    }

    // 종료된 스레드에는 댓글 작성 불가
    if (comment.discussion && comment.discussion.status === 'closed') {
      throw new AppError(403, 'THREAD_CLOSED', '종료된 스레드에는 댓글을 작성할 수 없습니다');
    }

    // Verify user is a member of the group
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: comment.discussion.groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 댓글을 작성할 수 있습니다');
    }
    assertReadingPeriodOpen(comment.discussion.group.readingStartDate, comment.discussion.group.readingEndDate);

    // 발언권 차감
    if (comment.discussion) {
      await tokenService.consume(comment.discussion.id, userId);
    }

    // 욕설 필터링
    const replyCheck = profanityService.check(content);
    if (!replyCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
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

    // 활동 점수 추가
    const { activityService } = await import('./activity.service');
    await activityService.addPoint(userId, 'reply', comment.discussion.groupId);

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
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 토론 주제를 생성할 수 있습니다');
    }
    assertReadingPeriodOpen(member.group.readingStartDate, member.group.readingEndDate);

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

    await notificationService.notifyThreadCreated(discussion.id);

    return discussion;
  },

  // 종료일 수정 (방장) — 종료된 스레드를 다시 진행중으로 바꿀 수 있음
  async updateEndDate(discussionId: string, userId: string, endDate: string) {
    const discussion = await prisma.discussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '스레드를 찾을 수 없습니다');

    const group = await prisma.group.findUnique({ where: { id: discussion.groupId } });
    if (!group || group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 종료일을 수정할 수 있습니다');
    }
    assertReadingPeriodOpen(group.readingStartDate, group.readingEndDate);

    const newEndDate = new Date(endDate);
    newEndDate.setHours(23, 59, 59, 999);
    const newStatus = newEndDate >= new Date() ? 'active' : 'closed';

    const updated = await prisma.discussion.update({
      where: { id: discussionId },
      data: { endDate: newEndDate, status: newStatus },
    });

    // 종료로 변경된 경우 인사이트 자동 생성
    if (newStatus === 'closed') {
      notificationService.notifyThreadEnded(discussionId).catch(() => {});
      generateInsightOnThreadClose(discussionId).catch(() => {});
    }

    return updated;
  },

  // 대표 스레드 설정 (방장, 최대 3개)
  async pinThread(discussionId: string, userId: string) {
    const discussion = await prisma.discussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '스레드를 찾을 수 없습니다');

    const group = await prisma.group.findUnique({ where: { id: discussion.groupId } });
    if (!group || group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 대표 스레드를 설정할 수 있습니다');
    }
    assertReadingPeriodOpen(group.readingStartDate, group.readingEndDate);

    // 최대 3개 확인
    const pinnedCount = await prisma.discussion.count({
      where: { groupId: discussion.groupId, isPinned: true },
    });
    if (pinnedCount >= 3) {
      throw new AppError(400, 'PIN_LIMIT', '대표 스레드는 최대 3개까지 설정할 수 있습니다');
    }

    return prisma.discussion.update({
      where: { id: discussionId },
      data: { isPinned: true },
    });
  },

  // 대표 스레드 해제 (방장)
  async unpinThread(discussionId: string, userId: string) {
    const discussion = await prisma.discussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '스레드를 찾을 수 없습니다');

    const group = await prisma.group.findUnique({ where: { id: discussion.groupId } });
    if (!group || group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 대표 스레드를 해제할 수 있습니다');
    }
    assertReadingPeriodOpen(group.readingStartDate, group.readingEndDate);

    return prisma.discussion.update({
      where: { id: discussionId },
      data: { isPinned: false },
    });
  },

  // 스레드 수정 (작성자)
  async updateTopic(discussionId: string, userId: string, data: { title: string; content: string | null; endDate: string | null }) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '스레드를 찾을 수 없습니다');
    if (discussion.authorId !== userId) throw new AppError(403, 'FORBIDDEN', '작성자만 수정할 수 있습니다');
    assertReadingPeriodOpen(discussion.group.readingStartDate, discussion.group.readingEndDate);

    // 욕설 필터링
    const titleCheck = profanityService.check(data.title);
    const contentCheck = data.content ? profanityService.check(data.content) : { isClean: true, matched: [] };
    if (!titleCheck.isClean || !contentCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    const updateData: any = { title: data.title, content: data.content };
    if (data.endDate) {
      const endDate = new Date(data.endDate);
      endDate.setHours(23, 59, 59, 999);
      const readingEnd = new Date(discussion.group.readingEndDate);
      readingEnd.setHours(23, 59, 59, 999);
      if (endDate > readingEnd) {
        throw new AppError(400, 'END_DATE_EXCEEDS_READING_PERIOD', '스레드 종료일은 독서기간 종료일을 초과할 수 없습니다');
      }
      updateData.endDate = endDate;
      updateData.status = endDate >= new Date() ? 'active' : 'closed';
    }

    const updated = await prisma.discussion.update({
      where: { id: discussionId },
      data: updateData,
      include: { author: { select: { id: true, nickname: true } } },
    });
    if (discussion.status !== 'closed' && updated.status === 'closed') {
      notificationService.notifyThreadEnded(discussionId).catch(() => {});
      generateInsightOnThreadClose(discussionId).catch(() => {});
    }
    return updated;
  },

  // 스레드 삭제 (작성자, 댓글 없는 경우만)
  async deleteTopic(discussionId: string, userId: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        group: { select: { readingStartDate: true, readingEndDate: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!discussion) throw new AppError(404, 'NOT_FOUND', '스레드를 찾을 수 없습니다');
    if (discussion.authorId !== userId) throw new AppError(403, 'FORBIDDEN', '작성자만 삭제할 수 있습니다');
    assertReadingPeriodOpen(discussion.group.readingStartDate, discussion.group.readingEndDate);
    if (discussion._count.comments > 0) throw new AppError(409, 'HAS_COMMENTS', '댓글이 있는 스레드는 삭제할 수 없습니다');

    await prisma.$transaction(async (tx) => {
      await tx.discussionToken.deleteMany({ where: { discussionId } });
      await tx.discussion.delete({ where: { id: discussionId } });
    });
  },

  // 의견 수정 (작성자)
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { discussion: { include: { group: { select: { readingStartDate: true, readingEndDate: true } } } } },
    });
    if (!comment) throw new AppError(404, 'NOT_FOUND', '의견을 찾을 수 없습니다');
    if (comment.authorId !== userId) throw new AppError(403, 'FORBIDDEN', '작성자만 수정할 수 있습니다');
    if (comment.discussion.status === 'closed') throw new AppError(403, 'THREAD_CLOSED', '종료된 스레드의 의견은 수정할 수 없습니다');
    assertReadingPeriodOpen(comment.discussion.group.readingStartDate, comment.discussion.group.readingEndDate);

    // 욕설 필터링
    const check = profanityService.check(content);
    if (!check.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    return prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: { select: { id: true, nickname: true } } },
    });
  },

  // 댓글 수정 (작성자)
  async updateReply(replyId: string, userId: string, content: string) {
    const reply = await prisma.reply.findUnique({
      where: { id: replyId },
      include: { comment: { include: { discussion: { include: { group: { select: { readingStartDate: true, readingEndDate: true } } } } } } },
    });
    if (!reply) throw new AppError(404, 'NOT_FOUND', '댓글을 찾을 수 없습니다');
    if (reply.authorId !== userId) throw new AppError(403, 'FORBIDDEN', '작성자만 수정할 수 있습니다');
    if (reply.comment.discussion.status === 'closed') throw new AppError(403, 'THREAD_CLOSED', '종료된 스레드의 댓글은 수정할 수 없습니다');
    assertReadingPeriodOpen(reply.comment.discussion.group.readingStartDate, reply.comment.discussion.group.readingEndDate);

    // 욕설 필터링
    const replyCheck = profanityService.check(content);
    if (!replyCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    return prisma.reply.update({
      where: { id: replyId },
      data: { content },
      include: { author: { select: { id: true, nickname: true } } },
    });
  },

  // KST 기준 오늘 시작 시각 계산
  _getTodayStartKST(): Date {
    // 서버가 KST 환경이면 로컬 자정이 곧 KST 자정
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },

  // 오늘 해당 모임에서 사용자가 생성한 스레드 수
  async getTodayCreateCount(groupId: string, userId: string): Promise<number> {
    const todayStart = this._getTodayStartKST();
    return prisma.discussion.count({
      where: {
        groupId,
        authorId: userId,
        createdAt: { gte: todayStart },
      },
    });
  },

  // 남은 생성 횟수 조회
  async getRemainingCount(groupId: string, userId: string): Promise<{ used: number; remaining: number; limit: number }> {
    const used = await this.getTodayCreateCount(groupId, userId);
    return { used, remaining: Math.max(0, 3 - used), limit: 3 };
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
