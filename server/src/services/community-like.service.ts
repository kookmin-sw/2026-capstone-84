import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { notificationService } from './notification.service';

// ===== 응답 타입 =====

export interface LikeToggleResult {
  liked: boolean;
  likeCount: number;
}

export interface LikeStatusResult {
  liked: boolean;
}

// ===== 서비스 =====

export const communityLikeService = {
  /**
   * 좋아요 토글
   * - 이미 좋아요한 경우 → 좋아요 취소 (삭제 + likeCount 감소)
   * - 아직 좋아요하지 않은 경우 → 좋아요 추가 (생성 + likeCount 증가)
   * - 트랜잭션으로 원자적 처리
   */
  async toggleLike(postId: string, userId: string): Promise<LikeToggleResult> {
    if (!postId || !postId.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '게시글 ID가 필요합니다');
    }

    // 게시글 존재 여부 확인
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, likeCount: true, authorId: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    // 기존 좋아요 여부 확인 (unique constraint: [postId, userId])
    const existingLike = await readerPrisma.communityLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingLike) {
      // 이미 좋아요한 경우 → 취소
      const [, updatedPost] = await writerPrisma.$transaction([
        writerPrisma.communityLike.delete({
          where: { id: existingLike.id },
        }),
        writerPrisma.communityPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ]);

      return {
        liked: false,
        likeCount: updatedPost.likeCount,
      };
    } else {
      // 아직 좋아요하지 않은 경우 → 추가
      const [, updatedPost] = await writerPrisma.$transaction([
        writerPrisma.communityLike.create({
          data: { postId, userId },
        }),
        writerPrisma.communityPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        }),
      ]);

      // 게시글 작성자에게 좋아요 알림 전송 (fire-and-forget)
      // 좋아요한 사용자의 닉네임을 조회
      readerPrisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true },
      }).then((actor) => {
        return notificationService.create({
          recipientId: post.authorId,
          actorId: userId,
          type: 'like',
          title: '좋아요',
          message: `${actor?.nickname ?? '사용자'}님이 게시글에 좋아요를 눌렀습니다`,
          linkUrl: `/community/${postId}`,
        });
      }).catch(console.error);

      return {
        liked: true,
        likeCount: updatedPost.likeCount,
      };
    }
  },

  /**
   * 좋아요 상태 확인
   * - 특정 사용자가 특정 게시글에 좋아요했는지 여부 반환
   */
  async getLikeStatus(postId: string, userId: string): Promise<LikeStatusResult> {
    if (!postId || !postId.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '게시글 ID가 필요합니다');
    }

    // 게시글 존재 여부 확인
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    const like = await readerPrisma.communityLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    return {
      liked: !!like,
    };
  },
};
