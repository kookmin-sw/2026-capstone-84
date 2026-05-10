import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';

// ===== 타입 =====

export type ReadingStatusType = 'reading' | 'completed' | 'want_to_read';

export interface ReadingStatusItem {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatusType;
  createdAt: Date;
  updatedAt: Date;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImageUrl: string | null;
  };
}

// ===== 서비스 =====

export const readingStatusService = {
  /**
   * 독서 상태 목록 조회
   * - userId 기준으로 조회
   * - status 파라미터로 필터링 가능
   */
  async getReadingStatuses(userId: string, status?: ReadingStatusType): Promise<ReadingStatusItem[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const statuses = await readerPrisma.readingStatus.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return statuses as ReadingStatusItem[];
  },

  /**
   * 책 추가
   * - userId + bookId unique 제약조건으로 중복 방지
   */
  async addBook(userId: string, bookId: string, status: ReadingStatusType): Promise<ReadingStatusItem> {
    if (!bookId || !bookId.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '책 ID가 필요합니다');
    }

    // 책 존재 여부 확인
    const book = await readerPrisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });

    if (!book) {
      throw new AppError(404, 'NOT_FOUND', '책을 찾을 수 없습니다');
    }

    // 이미 등록된 책인지 확인
    const existing = await readerPrisma.readingStatus.findUnique({
      where: {
        userId_bookId: { userId, bookId },
      },
    });

    if (existing) {
      throw new AppError(409, 'DUPLICATE', '이미 독서 목록에 등록된 책입니다');
    }

    const created = await writerPrisma.readingStatus.create({
      data: { userId, bookId, status },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
          },
        },
      },
    });

    return created as ReadingStatusItem;
  },

  /**
   * 상태 변경
   * - 본인의 독서 상태만 변경 가능
   */
  async updateStatus(id: string, userId: string, status: ReadingStatusType): Promise<ReadingStatusItem> {
    const existing = await readerPrisma.readingStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    if (existing.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 독서 상태만 변경할 수 있습니다');
    }

    const updated = await writerPrisma.readingStatus.update({
      where: { id },
      data: { status },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
          },
        },
      },
    });

    return updated as ReadingStatusItem;
  },

  /**
   * 책 제거
   * - 본인의 독서 상태만 삭제 가능
   */
  async removeBook(id: string, userId: string): Promise<void> {
    const existing = await readerPrisma.readingStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', '독서 상태를 찾을 수 없습니다');
    }

    if (existing.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 독서 상태만 삭제할 수 있습니다');
    }

    await writerPrisma.readingStatus.delete({
      where: { id },
    });
  },
};
