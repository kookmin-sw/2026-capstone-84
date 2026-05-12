import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';

export const readingMemoService = {
  /**
   * 독서 메모 목록 조회
   */
  async getMemos(userId: string, readingStatusId: string) {
    // 본인의 reading status인지 확인
    const status = await readerPrisma.readingStatus.findFirst({
      where: { id: readingStatusId, userId },
    });
    if (!status) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    return readerPrisma.readingMemo.findMany({
      where: { readingStatusId, userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * 독서 메모 생성
   */
  async createMemo(userId: string, readingStatusId: string, content: string, pageNumber?: number) {
    const status = await readerPrisma.readingStatus.findFirst({
      where: { id: readingStatusId, userId },
    });
    if (!status) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    return writerPrisma.readingMemo.create({
      data: {
        readingStatusId,
        userId,
        content,
        pageNumber: pageNumber ?? null,
      },
    });
  },

  /**
   * 독서 메모 수정
   */
  async updateMemo(id: string, userId: string, content: string, pageNumber?: number) {
    const memo = await readerPrisma.readingMemo.findFirst({
      where: { id, userId },
    });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }

    return writerPrisma.readingMemo.update({
      where: { id },
      data: {
        content,
        pageNumber: pageNumber ?? memo.pageNumber,
      },
    });
  },

  /**
   * 독서 메모 삭제
   */
  async deleteMemo(id: string, userId: string) {
    const memo = await readerPrisma.readingMemo.findFirst({
      where: { id, userId },
    });
    if (!memo) {
      throw new AppError(404, 'NOT_FOUND', '메모를 찾을 수 없습니다');
    }

    return writerPrisma.readingMemo.delete({ where: { id } });
  },

  /**
   * 현재 페이지 기록 업데이트 (이력도 저장)
   */
  async updateCurrentPage(readingStatusId: string, userId: string, currentPage: number) {
    const status = await readerPrisma.readingStatus.findFirst({
      where: { id: readingStatusId, userId },
    });
    if (!status) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    // 페이지 업데이트 + 이력 저장
    const [updated] = await writerPrisma.$transaction([
      writerPrisma.readingStatus.update({
        where: { id: readingStatusId },
        data: { currentPage },
      }),
      writerPrisma.readingProgressLog.create({
        data: { readingStatusId, userId, page: currentPage },
      }),
    ]);

    return updated;
  },

  /**
   * 진행도 이력 조회
   */
  async getProgressLogs(readingStatusId: string, userId: string) {
    const status = await readerPrisma.readingStatus.findFirst({
      where: { id: readingStatusId, userId },
    });
    if (!status) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    return readerPrisma.readingProgressLog.findMany({
      where: { readingStatusId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
