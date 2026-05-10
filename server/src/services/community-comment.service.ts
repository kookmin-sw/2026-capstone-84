import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { notificationService } from './notification.service';

// ===== 입력 타입 =====

export interface CreateCommentInput {
  postId: string;
  content: string;
}

export interface CreateReplyInput {
  parentId: string;
  content: string;
}

// ===== 서비스 =====

export const communityCommentService = {
  /**
   * 댓글 작성
   * - postId, content 필수
   * - 게시글의 commentCount 증가
   */
  async createComment(authorId: string, input: CreateCommentInput) {
    const { postId, content } = input;

    if (!postId || !postId.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '게시글 ID가 필요합니다');
    }
    if (!content || !content.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '댓글 내용을 입력해주세요');
    }

    // 게시글 존재 여부 확인
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    // 댓글 생성 + commentCount 증가 (트랜잭션)
    const [comment] = await writerPrisma.$transaction([
      writerPrisma.communityComment.create({
        data: {
          postId,
          authorId,
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, nickname: true, profileImageUrl: true } },
        },
      }),
      writerPrisma.communityPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // 게시글 작성자에게 알림 전송 (fire-and-forget)
    notificationService.create({
      recipientId: post.authorId,
      actorId: authorId,
      type: 'comment',
      title: '새 댓글',
      message: `${comment.author.nickname ?? '사용자'}님이 댓글을 남겼습니다`,
      linkUrl: `/community/${postId}`,
    }).catch(console.error);

    return comment;
  },

  /**
   * 대댓글 작성
   * - parentId 지정
   * - 게시글의 commentCount 증가
   */
  async createReply(authorId: string, input: CreateReplyInput) {
    const { parentId, content } = input;

    if (!parentId || !parentId.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '부모 댓글 ID가 필요합니다');
    }
    if (!content || !content.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '댓글 내용을 입력해주세요');
    }

    // 부모 댓글 존재 여부 확인
    const parentComment = await readerPrisma.communityComment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, authorId: true },
    });
    if (!parentComment) {
      throw new AppError(404, 'NOT_FOUND', '부모 댓글을 찾을 수 없습니다');
    }

    // 대댓글 생성 + commentCount 증가 (트랜잭션)
    const [reply] = await writerPrisma.$transaction([
      writerPrisma.communityComment.create({
        data: {
          postId: parentComment.postId,
          authorId,
          parentId,
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, nickname: true, profileImageUrl: true } },
        },
      }),
      writerPrisma.communityPost.update({
        where: { id: parentComment.postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // 부모 댓글 작성자에게 알림 전송 (fire-and-forget)
    notificationService.create({
      recipientId: parentComment.authorId,
      actorId: authorId,
      type: 'reply',
      title: '새 대댓글',
      message: `${reply.author.nickname ?? '사용자'}님이 대댓글을 남겼습니다`,
      linkUrl: `/community/${parentComment.postId}`,
    }).catch(console.error);

    return reply;
  },

  /**
   * 댓글 삭제
   * - 작성자 본인만 삭제 가능
   * - 대댓글이 있는 경우 Prisma cascade로 함께 삭제
   * - commentCount를 댓글 + 대댓글 수만큼 감소
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await readerPrisma.communityComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        parentId: true,
        _count: { select: { replies: true } },
      },
    });

    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', '댓글을 찾을 수 없습니다');
    }

    if (comment.authorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인이 작성한 댓글만 삭제할 수 있습니다');
    }

    // 삭제할 댓글 수 계산 (본인 + 대댓글 수)
    const deleteCount = 1 + comment._count.replies;

    // 댓글 삭제 + commentCount 감소 (트랜잭션)
    await writerPrisma.$transaction([
      writerPrisma.communityComment.delete({
        where: { id: commentId },
      }),
      writerPrisma.communityPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: deleteCount } },
      }),
    ]);

    return { success: true };
  },

  /**
   * 게시글별 댓글 목록 조회
   * - 작성 시간 순 (ASC)
   * - 대댓글은 부모 댓글 하위에 중첩
   * - 작성자 정보 포함 (id, nickname, profileImageUrl)
   */
  async getCommentsByPostId(postId: string) {
    // 게시글 존재 여부 확인
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    // 최상위 댓글만 조회 (parentId가 null인 것)
    const comments = await readerPrisma.communityComment.findMany({
      where: {
        postId,
        parentId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, nickname: true, profileImageUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, nickname: true, profileImageUrl: true } },
          },
        },
      },
    });

    return comments;
  },
};
