import { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from './auth.service';
import { CreateGroupInput, UpdateGroupInput } from '../validators';
import { profanityService } from './profanity.service';

const prisma = new PrismaClient();

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const normalizeTags = (tags?: string[]) =>
  (tags ?? [])
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(tag => tag.slice(0, 15));

const mapTags = (tags?: { name: string }[]) => tags?.map(tag => tag.name) ?? [];

type GroupSearchType = 'bookTitle' | 'groupName' | 'owner' | 'tag' | 'bookAuthor';
type GroupSort = 'createdDesc' | 'createdAsc' | 'startDesc' | 'startAsc' | 'endDesc' | 'endAsc';

const getGroupOrderBy = (sort?: string): Prisma.GroupOrderByWithRelationInput => {
  const normalizedSort: GroupSort =
    sort === 'createdAsc' ||
    sort === 'startDesc' ||
    sort === 'startAsc' ||
    sort === 'endDesc' ||
    sort === 'endAsc'
      ? sort
      : 'createdDesc';

  if (normalizedSort === 'createdAsc') return { createdAt: 'asc' };
  if (normalizedSort === 'startDesc') return { readingStartDate: 'desc' };
  if (normalizedSort === 'startAsc') return { readingStartDate: 'asc' };
  if (normalizedSort === 'endDesc') return { readingEndDate: 'desc' };
  if (normalizedSort === 'endAsc') return { readingEndDate: 'asc' };
  return { createdAt: 'desc' };
};

export const groupService = {
  async create(data: CreateGroupInput, userId: string) {
    // 모임명/설명 욕설 필터링
    const nameCheck = profanityService.check(data.name);
    if (!nameCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }
    if (data.description) {
      const descCheck = profanityService.check(data.description);
      if (!descCheck.isClean) {
        throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
      }
    }

    // 날짜 검증: 시작일은 오늘 이후, 종료일은 시작일 이후
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(data.readingStartDate);
    const endDate = new Date(data.readingEndDate);
    if (startDate < today) {
      throw new AppError(400, 'VALIDATION_ERROR', '독서 시작일은 오늘 이후여야 합니다');
    }
    if (endDate < startDate) {
      throw new AppError(400, 'VALIDATION_ERROR', '독서 종료일은 시작일 이후여야 합니다');
    }

    // Find or create the Book entity
    let bookId = data.bookId;

    if (!bookId) {
      const book = await prisma.book.create({
        data: {
          title: data.bookTitle,
          author: data.bookAuthor ?? null,
          coverImageUrl: data.bookCoverUrl ?? null,
          summary: data.bookSummary ?? null,
        },
      });
      bookId = book.id;
    } else {
      const existing = await prisma.book.findUnique({ where: { id: bookId } });
      if (!existing) {
        const book = await prisma.book.create({
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
    // 태그 욕설 필터링
    if (data.tags) {
      const tags = normalizeTags(data.tags);
      for (const tag of tags) {
        const tagCheck = profanityService.check(tag);
        if (!tagCheck.isClean) {
          throw new AppError(400, 'PROFANITY_DETECTED', '태그에 부적절한 표현이 포함되어 있습니다.');
        }
      }
    }

    const group = await prisma.$transaction(async (tx: TransactionClient) => {
      const created = await tx.group.create({
        data: {
          bookId,
          ownerId: userId,
          name: data.name,
          description: data.description ?? null,
          maxMembers: data.maxMembers,
          readingStartDate: new Date(data.readingStartDate),
          readingEndDate: new Date(data.readingEndDate),
          isPrivate: data.isPrivate ?? false,
          password: data.password ?? null,
          tags: {
            create: normalizeTags(data.tags).map(name => ({ name })),
          },
        },
        include: { book: true, tags: { orderBy: { createdAt: 'asc' } } },
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

    return { ...group, tags: mapTags(group.tags) };
  },

  async list(query?: { search?: string; searchType?: string; sort?: string; page?: number; limit?: number }, userId?: string) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where: any = {
      readingEndDate: { gte: todayStart },
    };
    const search = query?.search?.trim();
    if (search) {
      const searchType: GroupSearchType =
        query?.searchType === 'bookAuthor' ||
        query?.searchType === 'groupName' ||
        query?.searchType === 'owner' ||
        query?.searchType === 'tag'
          ? query.searchType
          : 'bookTitle';

      if (searchType === 'bookAuthor') {
        where.book = { author: { contains: search } };
      } else if (searchType === 'groupName') {
        where.name = { contains: search };
      } else if (searchType === 'owner') {
        where.owner = { nickname: { contains: search } };
      } else if (searchType === 'tag') {
        where.tags = { some: { name: { contains: search } } };
      } else {
        where.book = { title: { contains: search } };
      }
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: getGroupOrderBy(query?.sort),
        include: {
          book: true,
          owner: { select: { id: true, nickname: true } },
          tags: { orderBy: { createdAt: 'asc' } },
          _count: { select: { members: true } },
          members: userId ? { where: { userId }, select: { userId: true } } : false,
        },
      }),
      prisma.group.count({ where }),
    ]);

    const items = groups.map((g: typeof groups[number]) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      maxMembers: g.maxMembers,
      readingStartDate: g.readingStartDate,
      readingEndDate: g.readingEndDate,
      createdAt: g.createdAt,
      ownerId: g.ownerId,
      ownerNickname: g.owner?.nickname || null,
      isPrivate: g.isPrivate,
      tags: mapTags(g.tags),
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
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        book: true,
        owner: { select: { id: true, nickname: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, email: true } },
          },
        },
        tags: { orderBy: { createdAt: 'asc' } },
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
        prisma.memo.findMany({
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
        prisma.discussion.findMany({
          where: { groupId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: { select: { id: true, nickname: true } },
          },
        }),
        prisma.announcement.findMany({
          where: { groupId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ]);
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      maxMembers: group.maxMembers,
      readingStartDate: group.readingStartDate,
      readingEndDate: group.readingEndDate,
      discussionDate: group.discussionDate,
      createdAt: group.createdAt,
      ownerId: group.ownerId,
      isPrivate: group.isPrivate,
      tags: mapTags(group.tags),
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
  },

  async join(groupId: string, userId: string, password?: string, inviteToken?: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }

    // 비공개 모임: 초대코드가 맞으면 비번 없이 통과, 아니면 비밀번호 검증
    if (group.isPrivate) {
      const bypassByInvite = inviteToken && group.inviteCode === inviteToken;
      if (!bypassByInvite) {
        if (!password) {
          throw new AppError(403, 'PASSWORD_REQUIRED', '비공개 모임입니다. 비밀번호를 입력해주세요.');
        }
        if (password !== group.password) {
          throw new AppError(403, 'WRONG_PASSWORD', '비밀번호가 올바르지 않습니다.');
        }
      }
    }

    // 차단 여부 확인
    const banned = await prisma.groupBan.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (banned) {
      throw new AppError(403, 'BANNED', '이 모임에서 강제 퇴장되어 참여할 수 없습니다');
    }

    // Check duplicate membership
    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      throw new AppError(409, 'ALREADY_JOINED', '이미 참여 중인 모임입니다');
    }

    // Check capacity
    if (group._count.members >= group.maxMembers) {
      throw new AppError(409, 'GROUP_FULL', '모집 인원이 마감되었습니다');
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: 'member',
      },
    });

    // 활동 점수 추가
    const { activityService } = await import('./activity.service');
    await activityService.addPoint(userId, 'join', groupId);
  },

  async update(groupId: string, userId: string, data: UpdateGroupInput) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new AppError(404, 'NOT_FOUND', '모임을 찾을 수 없습니다');
    }
    if (group.ownerId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '방장만 모임을 수정할 수 있습니다');
    }

    // 모임명/설명 욕설 필터링
    if (data.name) {
      const nameCheck = profanityService.check(data.name);
      if (!nameCheck.isClean) {
        throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
      }
    }
    if (data.description) {
      const descCheck = profanityService.check(data.description);
      if (!descCheck.isClean) {
        throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.maxMembers !== undefined) updateData.maxMembers = data.maxMembers;
    if (data.readingStartDate !== undefined) updateData.readingStartDate = new Date(data.readingStartDate);
    if (data.readingEndDate !== undefined) updateData.readingEndDate = new Date(data.readingEndDate);
    if (data.isPrivate !== undefined) {
      updateData.isPrivate = data.isPrivate;
      if (data.isPrivate === false) {
        // 공개로 전환 시 비밀번호 제거
        updateData.password = null;
      } else if (data.isPrivate === true && !group.isPrivate && !data.password) {
        // 공개 → 비공개 전환인데 비밀번호가 없으면 에러
        throw new AppError(400, 'VALIDATION_ERROR', '비공개 모임은 비밀번호를 설정해야 합니다');
      }
    }
    if (data.password !== undefined && data.password !== null) {
      updateData.password = data.password;
    }

    return prisma.$transaction(async (tx: TransactionClient) => {
      if (data.tags !== undefined) {
        await tx.groupTag.deleteMany({ where: { groupId } });
        const tags = normalizeTags(data.tags);
        // 태그 욕설 필터링
        for (const tag of tags) {
          const tagCheck = profanityService.check(tag);
          if (!tagCheck.isClean) {
            throw new AppError(400, 'PROFANITY_DETECTED', '태그에 부적절한 표현이 포함되어 있습니다.');
          }
        }
        if (tags.length > 0) {
          await tx.groupTag.createMany({
            data: tags.map(name => ({ groupId, name })),
          });
        }
      }

      const updated = await tx.group.update({
        where: { id: groupId },
        data: updateData,
        include: { book: true, tags: { orderBy: { createdAt: 'asc' } } },
      });
      return { ...updated, tags: mapTags(updated.tags) };
    });
  },

  async updateProgress(groupId: string, userId: string, readingProgress: number) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 진행률을 업데이트할 수 있습니다');
    }
    return prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { readingProgress },
    });
  },

  async delete(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
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
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.notification.deleteMany({ where: { groupId } });
      await tx.reply.deleteMany({ where: { comment: { discussion: { groupId } } } });
      await tx.comment.deleteMany({ where: { discussion: { groupId } } });
      await tx.discussionToken.deleteMany({ where: { discussion: { groupId } } });
      await tx.discussion.deleteMany({ where: { groupId } });
      await tx.memo.deleteMany({ where: { groupId } });
      await tx.announcement.deleteMany({ where: { groupId } });
      await tx.discussionSchedule.deleteMany({ where: { groupId } });
      await tx.discussionInsight.deleteMany({ where: { groupId } });
      await tx.groupBan.deleteMany({ where: { groupId } });
      await tx.groupTag.deleteMany({ where: { groupId } });
      await tx.groupMember.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });
  },

  async leave(groupId: string, userId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(404, 'NOT_FOUND', '참여 중인 모임이 아닙니다');
    }
    if (member.role === 'owner') {
      throw new AppError(403, 'FORBIDDEN', '방장은 모임을 나갈 수 없습니다. 모임 삭제를 이용해주세요.');
    }
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  },
};
