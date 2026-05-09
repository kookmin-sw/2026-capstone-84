import { Prisma, PrismaClient } from '@prisma/client';
import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { CreateGroupInput, UpdateGroupInput } from '../validators';
import { redisService } from './redis.service';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export const groupService = {
  async create(data: CreateGroupInput, userId: string) {
    // Find or create the Book entity
    let bookId = data.bookId;

    if (!bookId) {
      const book = await writerPrisma.book.create({
        data: {
          title: data.bookTitle,
          author: data.bookAuthor ?? null,
          coverImageUrl: data.bookCoverUrl ?? null,
          summary: data.bookSummary ?? null,
        },
      });
      bookId = book.id;
    } else {
      const existing = await readerPrisma.book.findUnique({ where: { id: bookId } });
      if (!existing) {
        const book = await writerPrisma.book.create({
          data: {
            title: data.bookTitle,
            author: data.bookAuthor ?? null,
            coverImageUrl: data.bookCoverUrl ?? null,
            summary: data.bookSummary ?? null,
          },
        });
        bookId = book.id;
      }
    }

    // Create group and owner membership in a transaction
    const group = await writerPrisma.$transaction(async (tx: TransactionClient) => {
      const created = await tx.group.create({
        data: {
          bookId,
          ownerId: userId,
          name: data.name,
          description: data.description ?? null,
          maxMembers: data.maxMembers,
          readingStartDate: new Date(data.readingStartDate),
          readingEndDate: new Date(data.readingEndDate),
          discussionDate: new Date(data.discussionDate),
        },
        include: { book: true },
      });

      // Auto-register owner as first member
      await tx.groupMember.create({
        data: {
          groupId: created.id,
          userId,
          role: 'owner',
        },
      });

      return created;
    });

    return group;
  },

  async list(query?: { search?: string; page?: number; limit?: number }, userId?: string) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.book = {
        title: { contains: query.search },
      };
    }

    const [groups, total] = await Promise.all([
      readerPrisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          book: true,
          _count: { select: { members: true } },
          members: userId ? { where: { userId }, select: { userId: true } } : false,
        },
      }),
      readerPrisma.group.count({ where }),
    ]);

    const items = groups.map((g: typeof groups[number]) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      maxMembers: g.maxMembers,
      readingStartDate: g.readingStartDate,
      readingEndDate: g.readingEndDate,
      discussionDate: g.discussionDate,
      createdAt: g.createdAt,
      ownerId: g.ownerId,
      memberCount: g._count.members,
      isMember: userId ? (g as any).members?.length > 0 : false,
      book: {
        id: g.book.id,
        title: g.book.title,
        author: g.book.author,
        coverImageUrl: g.book.coverImageUrl,
        summary: g.book.summary,
      },
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getDetail(groupId: string, userId: string) {
    // 캐시에서 조회 시도
    const cacheId = `${groupId}:user:${userId}`;
    const cached = await redisService.getCache<any>('group', cacheId);
    if (cached) {
      return cached;
    }

    const group = await readerPrisma.group.findUnique({
      where: { id: groupId },
      include: {
        book: true,
        owner: { select: { id: true, nickname: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, email: true } },
          },
        },
      },
    });

    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    // Check if user is a member
    const isMember = group.members.some((m: typeof group.members[number]) => m.userId === userId);

    // Get recent memos and discussions summary if user is a member
    let recentMemos: any[] = [];
    let recentDiscussions: any[] = [];
    let announcements: any[] = [];

    if (isMember) {
      [recentMemos, recentDiscussions, announcements] = await Promise.all([
        readerPrisma.memo.findMany({
          where: {
            groupId,
            OR: [
              { userId },
              { visibility: { not: 'private' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: { select: { id: true, nickname: true } },
          },
        }),
        readerPrisma.discussion.findMany({
          where: { groupId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, nickname: true } },
          },
        }),
        readerPrisma.announcement.findMany({
          where: { groupId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ]);
    }

    const result = {
      id: group.id,
      name: group.name,
      description: group.description,
      maxMembers: group.maxMembers,
      readingStartDate: group.readingStartDate,
      readingEndDate: group.readingEndDate,
      discussionDate: group.discussionDate,
      createdAt: group.createdAt,
      ownerId: group.ownerId,
      book: {
        id: group.book.id,
        title: group.book.title,
        author: group.book.author,
        coverImageUrl: group.book.coverImageUrl,
        summary: group.book.summary,
      },
      owner: group.owner,
      members: group.members.map((m: typeof group.members[number]) => ({
        id: m.id,
        userId: m.user.id,
        nickname: m.user.nickname,
        role: m.role,
        readingProgress: m.readingProgress,
        joinedAt: m.joinedAt,
      })),
      isMember,
      memberCount: group.members.length,
      recentMemos: recentMemos.map((m) => ({
        id: m.id,
        content: m.content.substring(0, 100),
        pageStart: m.pageStart,
        pageEnd: m.pageEnd,
        isPublic: m.isPublic,
        visibility: m.visibility,
        authorNickname: m.user.nickname,
        createdAt: m.createdAt,
      })),
      recentDiscussions: recentDiscussions.map((d) => ({
        id: d.id,
        title: d.title,
        authorNickname: d.author.nickname,
        createdAt: d.createdAt,
      })),
      announcements: announcements.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        createdAt: a.createdAt,
      })),
    };

    // 결과를 캐시에 저장 (TTL 300초)
    await redisService.setCache('group', cacheId, result);

    return result;
  },

  async join(groupId: string, userId: string) {
    const group = await readerPrisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    // 차단 여부 확인
    const banned = await readerPrisma.groupBan.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (banned) {
      throw new AppError(403, 'BANNED', '이 모임에서 강제 퇴장되어 참여할 수 없습니다');
    }

    // Check duplicate membership
    const existingMember = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      throw new AppError(409, 'ALREADY_JOINED', '이미 참여 중인 모임입니다');
    }

    // Check capacity
    if (group._count.members >= group.maxMembers) {
      throw new AppError(409, 'GROUP_FULL', '모집 인원이 마감되었습니다');
    }

    await writerPrisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: 'member',
      },
    });

    // 캐시 무효화: 그룹 정보 캐시 삭제 (멤버 변경)
    await redisService.invalidateCache(`group:${groupId}:*`);
  },

  async update(groupId: string, userId: string, data: UpdateGroupInput) {
    const group = await readerPrisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    if (group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 모임을 수정할 수 있습니다');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.maxMembers !== undefined) updateData.maxMembers = data.maxMembers;
    if (data.readingStartDate !== undefined) updateData.readingStartDate = new Date(data.readingStartDate);
    if (data.readingEndDate !== undefined) updateData.readingEndDate = new Date(data.readingEndDate);
    if (data.discussionDate !== undefined) updateData.discussionDate = new Date(data.discussionDate);

    const updated = await writerPrisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: { book: true },
    });

    // 캐시 무효화: 그룹 정보 캐시 삭제
    await redisService.invalidateCache(`group:${groupId}:*`);

    return updated;
  },

  async updateProgress(groupId: string, userId: string, readingProgress: number) {
    const member = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 진행률을 업데이트할 수 있습니다');
    }
    const updated = await writerPrisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { readingProgress },
    });

    // 캐시 무효화: 그룹 정보 캐시 삭제 (멤버 진행률 변경)
    await redisService.invalidateCache(`group:${groupId}:*`);

    return updated;
  },

  async delete(groupId: string, userId: string) {
    const group = await readerPrisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });
    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    if (group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 모임을 삭제할 수 있습니다');
    }
    // 방장 포함 1명(본인)만 있을 때만 삭제 가능
    if (group._count.members > 1) {
      throw new AppError(409, 'GROUP_HAS_MEMBERS', '참여자가 있는 모임은 삭제할 수 없습니다');
    }

    // 연관 데이터 삭제 (순서 중요: FK 의존성)
    await writerPrisma.$transaction(async (tx: TransactionClient) => {
      await tx.reply.deleteMany({ where: { comment: { discussion: { groupId } } } });
      await tx.comment.deleteMany({ where: { discussion: { groupId } } });
      await tx.discussion.deleteMany({ where: { groupId } });
      await tx.memo.deleteMany({ where: { groupId } });
      await tx.groupMember.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });

    // 캐시 무효화: 그룹 정보 및 토론 목록 캐시 삭제
    await redisService.invalidateCache(`group:${groupId}:*`);
    await redisService.invalidateCache(`discussions:${groupId}:*`);
  },

  async leave(groupId: string, userId: string) {
    const member = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(404, 'NOT_FOUND', '참여 중인 모임이 아닙니다');
    }
    if (member.role === 'owner') {
      throw new AppError(403, 'FORBIDDEN', '방장은 모임을 나갈 수 없습니다. 모임 삭제를 이용해주세요.');
    }
    await writerPrisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    // 캐시 무효화: 그룹 정보 캐시 삭제 (멤버 변경)
    await redisService.invalidateCache(`group:${groupId}:*`);
  },
};
