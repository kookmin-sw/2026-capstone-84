import { writerPrisma, readerPrisma } from '../lib/prisma';
import { SpoilerFilterMode, SPOILER_FILTER_MODES } from '../types/community';
import { AppError } from './auth.service';

// ===== 타입 정의 =====

export interface CommunityPostForFilter {
  id: string;
  bookId: string;
  content: string;
  [key: string]: any;
}

export interface FilteredPost extends CommunityPostForFilter {
  isSpoilerMasked?: boolean;
}

const SPOILER_MASK_PLACEHOLDER = '스포일러 방지를 위해 내용이 숨겨져 있습니다';

// ===== 서비스 =====

export const spoilerService = {
  /**
   * 사용자의 스포일러 필터 설정 조회
   * - UserSpoilerSetting 테이블에서 조회
   * - 레코드가 없으면 기본값 'off' 반환
   */
  async getUserSetting(userId: string): Promise<SpoilerFilterMode> {
    const setting = await readerPrisma.userSpoilerSetting.findUnique({
      where: { userId },
    });

    if (!setting) {
      return 'off';
    }

    return setting.mode as SpoilerFilterMode;
  },

  /**
   * 사용자의 스포일러 필터 설정 변경
   * - upsert로 레코드가 없으면 생성, 있으면 업데이트
   */
  async updateSetting(userId: string, mode: SpoilerFilterMode): Promise<void> {
    if (!SPOILER_FILTER_MODES.includes(mode)) {
      throw new AppError(400, 'VALIDATION_ERROR', '유효하지 않은 스포일러 필터 모드입니다');
    }

    await writerPrisma.userSpoilerSetting.upsert({
      where: { userId },
      create: { userId, mode },
      update: { mode },
    });
  },

  /**
   * 사용자가 읽은 책 ID 목록 조회
   * - 독서 상태가 'reading' 또는 'completed'인 책의 ID를 반환
   * - 쿼리 레벨 필터링(hide_completely)에서 사용
   */
  async getUserReadBookIds(userId: string): Promise<string[]> {
    const readingStatuses = await readerPrisma.readingStatus.findMany({
      where: {
        userId,
        status: { in: ['reading', 'completed'] },
      },
      select: { bookId: true },
    });

    return readingStatuses.map((rs) => rs.bookId);
  },

  /**
   * 게시글 목록에 스포일러 필터 적용
   * - off: 필터 없이 그대로 반환
   * - hide_completely: 읽지 않은 책의 게시글을 제외
   * - hide_content: 읽지 않은 책의 게시글 내용을 마스킹 처리
   */
  async filterPosts(
    posts: CommunityPostForFilter[],
    userId: string,
    mode: SpoilerFilterMode,
  ): Promise<FilteredPost[]> {
    // 필터 비활성화 시 그대로 반환
    if (mode === 'off') {
      return posts.map((post) => ({ ...post, isSpoilerMasked: false }));
    }

    // 사용자가 읽은 책 ID 목록 조회
    const readBookIds = await this.getUserReadBookIds(userId);
    const readBookIdSet = new Set(readBookIds);

    if (mode === 'hide_completely') {
      // 읽지 않은 책의 게시글을 제외 (읽은 책의 게시글만 반환)
      return posts
        .filter((post) => readBookIdSet.has(post.bookId))
        .map((post) => ({ ...post, isSpoilerMasked: false }));
    }

    if (mode === 'hide_content') {
      // 읽지 않은 책의 게시글 내용을 마스킹 처리
      return posts.map((post) => {
        if (readBookIdSet.has(post.bookId)) {
          return { ...post, isSpoilerMasked: false };
        }
        return {
          ...post,
          content: SPOILER_MASK_PLACEHOLDER,
          isSpoilerMasked: true,
        };
      });
    }

    // fallback (should not reach here)
    return posts.map((post) => ({ ...post, isSpoilerMasked: false }));
  },
};
