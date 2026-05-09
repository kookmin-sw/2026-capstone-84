import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { CreateMemoInput, UpdateMemoInput } from '../validators';
import { searchService } from './search.service';

export const memoService = {
  async create(groupId: string, userId: string, data: CreateMemoInput) {
    const member = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 메모를 작성할 수 있습니다');
    }

    // visibility에서 isPublic 동기화
    const visibility = data.visibility ?? 'private';
    const isPublic = visibility === 'public';
    if (data.pageEnd > member.readingProgress) {
      throw new AppError(400, 'INVALID_PAGE_RANGE', `아직 읽지 않은 페이지입니다. 현재 읽은 페이지: ${member.readingProgress}`);
    }

    const memo = await writerPrisma.memo.create({
      data: {
        groupId,
        userId,
        pageStart: data.pageStart,
        pageEnd: data.pageEnd,
        content: data.content,
        isPublic,
        visibility,
      },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    // OpenSearch 비동기 인덱싱 (fire-and-forget)
    readerPrisma.group.findUnique({
      where: { id: groupId },
      include: { book: { select: { title: true } } },
    }).then((group) => {
      const firstLine = memo.content.split('\n')[0] || '';
      searchService.indexDocument('memos', memo.id, {
        type: 'memo',
        title: firstLine,
        content: memo.content,
        authorNickname: memo.user.nickname,
        bookTitle: group?.book?.title ?? '',
        groupId,
        createdAt: memo.createdAt.toISOString(),
      }).catch(err => console.error('[Search] memo indexing failed:', err));
    }).catch(err => console.error('[Search] failed to fetch group for memo indexing:', err));

    return memo;
  },

  async update(memoId: string, userId: string, data: UpdateMemoInput) {
    const memo = await readerPrisma.memo.findUnique({ where: { id: memoId } });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 수정할 수 있습니다');
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

    const updated = await writerPrisma.memo.update({
      where: { id: memoId },
      data: updateData,
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    // OpenSearch 비동기 인덱스 업데이트 (fire-and-forget)
    const firstLine = updated.content.split('\n')[0] || '';
    searchService.updateDocument('memos', memoId, {
      title: firstLine,
      content: updated.content,
    }).catch(err => console.error('[Search] memo update indexing failed:', err));

    return updated;
  },

  async delete(memoId: string, userId: string) {
    const memo = await readerPrisma.memo.findUnique({ where: { id: memoId } });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 삭제할 수 있습니다');
    }

    await writerPrisma.memo.delete({ where: { id: memoId } });

    // OpenSearch 비동기 인덱스 삭제 (fire-and-forget)
    searchService.deleteDocument('memos', memoId)
      .catch(err => console.error('[Search] memo delete from index failed:', err));
  },

  async updateVisibility(memoId: string, userId: string, visibility: string) {
    const memo = await readerPrisma.memo.findUnique({ where: { id: memoId } });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }
    if (memo.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 메모만 공개 여부를 변경할 수 있습니다');
    }

    // 비공개/스포일러 → 공개 전환 시, 본인의 독서 진행도가 메모의 pageEnd 이상이어야 함
    if (visibility === 'public' && memo.visibility !== 'public') {
      const member = await readerPrisma.groupMember.findUnique({
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

    const updated = await writerPrisma.memo.update({
      where: { id: memoId },
      data: { visibility, isPublic },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });

    return updated;
  },

  async listByGroup(groupId: string, userId: string) {
    const member = await readerPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new AppError(403, 'FORBIDDEN', '모임 참여자만 메모를 조회할 수 있습니다');
    }

    const readingProgress = member.readingProgress;

    // 본인 메모 전부 + 타인의 public/spoiler 메모 (private 제외)
    const memos = await readerPrisma.memo.findMany({
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
