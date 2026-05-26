import { PrismaClient } from '@prisma/client';
import { AppError } from './auth.service';
import { CreateMemoInput, UpdateMemoInput } from '../validators';
import { assertReadingPeriodOpen } from './reading-period.service';
import { profanityService } from './profanity.service';

const prisma = new PrismaClient();

export const memoService = {
  async create(groupId: string, userId: string, data: CreateMemoInput, imageUrl?: string) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 메모를 작성할 수 있습니다');
    }
    assertReadingPeriodOpen(member.group.readingStartDate, member.group.readingEndDate);

    // 욕설 필터링
    const contentCheck = profanityService.check(data.content);
    if (!contentCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    // visibility에서 isPublic 동기화
    const visibility = data.visibility ?? 'private';
    const isPublic = visibility === 'public';

    // 메모의 끝 페이지가 현재 진행도보다 크면 자동 갱신
    if (data.pageEnd > member.readingProgress) {
      await prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { readingProgress: data.pageEnd },
      });
    }

    const memo = await prisma.memo.create({
      data: {
        groupId,
        userId,
        pageStart: data.pageStart,
        pageEnd: data.pageEnd,
        content: data.content,
        imageUrl: imageUrl ?? null,
        isPublic,
        visibility,
      },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    // 활동 점수 추가
    const { activityService } = await import('./activity.service');
    await activityService.addPoint(userId, 'memo', groupId);

    return memo;
  },

  async update(memoId: string, userId: string, data: UpdateMemoInput) {
    const memo = await prisma.memo.findUnique({
      where: { id: memoId },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 수정할 수 있습니다');
    }
    assertReadingPeriodOpen(memo.group.readingStartDate, memo.group.readingEndDate);

    // 욕설 필터링
    if (data.content) {
      const contentCheck = profanityService.check(data.content);
      if (!contentCheck.isClean) {
        throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
      }
    }

    const updateData: any = {};
    if (data.pageStart !== undefined) updateData.pageStart = data.pageStart;
    if (data.pageEnd !== undefined) updateData.pageEnd = data.pageEnd;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.visibility !== undefined) {
      updateData.visibility = data.visibility;
      updateData.isPublic = data.visibility === 'public';
    } else if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic;
    }

    const updated = await prisma.memo.update({
      where: { id: memoId },
      data: updateData,
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    return updated;
  },

  async delete(memoId: string, userId: string) {
    const memo = await prisma.memo.findUnique({
      where: { id: memoId },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 삭제할 수 있습니다');
    }
    assertReadingPeriodOpen(memo.group.readingStartDate, memo.group.readingEndDate);

    await prisma.memo.delete({ where: { id: memoId } });
  },

  async updateVisibility(memoId: string, userId: string, visibility: string) {
    const memo = await prisma.memo.findUnique({
      where: { id: memoId },
      include: { group: { select: { readingStartDate: true, readingEndDate: true } } },
    });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 공개 여부를 변경할 수 있습니다');
    }
    assertReadingPeriodOpen(memo.group.readingStartDate, memo.group.readingEndDate);

    // 비공개/스포일러 → 공개 전환 시, 본인의 독서 진행도가 메모의 pageEnd 이상이어야 함
    if (visibility === 'public' && memo.visibility !== 'public') {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: memo.groupId, userId } },
      });
      if (!member) {
        throw new AppError(403, 'FORBIDDEN', '모임 참여자만 공개 여부를 변경할 수 있습니다');
      }
      if (member.readingProgress < memo.pageEnd) {
        throw new AppError(403, 'READING_PROGRESS_INSUFFICIENT', `메모를 공개하려면 ${memo.pageEnd}쪽 이상 읽어야 합니다 (현재 ${member.readingProgress}쪽)`);
      }
    }

    const isPublic = visibility === 'public';

    const updated = await prisma.memo.update({
      where: { id: memoId },
      data: { visibility, isPublic },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    return updated;
  },

  async listByGroup(groupId: string, userId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 메모를 조회할 수 있습니다');
    }

    const readingProgress = member.readingProgress;

    // 본인 메모 전부 + 타인의 public/spoiler 메모 (private 제외)
    const memos = await prisma.memo.findMany({
      where: {
        groupId,
        OR: [
          { userId },
          { visibility: 'public' },
          { visibility: 'spoiler' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    const result = memos.map((memo: typeof memos[number]) => {
      const isOwn = memo.userId === userId;
      // 본인 메모: 항상 열람 가능
      // 타인 public: 항상 열람 가능
      // 타인 spoiler: readingProgress >= pageEnd 일 때만 열람
      let canView = true;
      if (!isOwn) {
        if (memo.visibility === 'spoiler') {
          canView = readingProgress >= memo.pageEnd;
        }
      }

      return {
        id: memo.id,
        groupId: memo.groupId,
        userId: memo.userId,
        pageStart: memo.pageStart,
        pageEnd: memo.pageEnd,
        content: canView ? memo.content : null,
        imageUrl: canView ? (memo as any).imageUrl : null,
        isPublic: memo.isPublic,
        visibility: memo.visibility,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
        isOwn,
        canView,
        user: memo.user,
      };
    });

    return result;
  },
};
