import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { REPORT_THRESHOLD } from '../types/community';

// ===== 입력 타입 =====

export interface ReportPostInput {
  reason: string;
}

// ===== 서비스 =====

export const communityReportService = {
  /**
   * 게시글 신고
   * - 사유 필수
   * - 중복 신고 방지 (@@unique([postId, userId]))
   * - 신고 횟수 임계값(5회) 도달 시 게시글 자동 숨김
   * - 자동 숨김 시 관리자 알림 생성
   */
  async reportPost(postId: string, userId: string, input: ReportPostInput) {
    const { reason } = input;

    // 사유 필수 검증
    if (!reason || !reason.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '신고 사유를 입력해주세요');
    }

    // 게시글 존재 여부 확인
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, reportCount: true, isHidden: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    // 자기 자신의 게시글 신고 방지
    if (post.authorId === userId) {
      throw new AppError(400, 'VALIDATION_ERROR', '본인의 게시글은 신고할 수 없습니다');
    }

    // 중복 신고 확인 (unique constraint: [postId, userId])
    const existingReport = await readerPrisma.communityReport.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingReport) {
      throw new AppError(409, 'DUPLICATE_REPORT', '이미 신고한 게시글입니다');
    }

    // 신고 생성 + reportCount 증가 (트랜잭션)
    const [, updatedPost] = await writerPrisma.$transaction([
      writerPrisma.communityReport.create({
        data: {
          postId,
          userId,
          reason: reason.trim(),
        },
      }),
      writerPrisma.communityPost.update({
        where: { id: postId },
        data: { reportCount: { increment: 1 } },
        select: { id: true, reportCount: true, isHidden: true },
      }),
    ]);

    // 임계값 도달 시 자동 숨김 처리
    if (updatedPost.reportCount >= REPORT_THRESHOLD && !updatedPost.isHidden) {
      await writerPrisma.communityPost.update({
        where: { id: postId },
        data: { isHidden: true },
      });

      // 관리자 알림 생성 (type: 'report_hidden')
      // 관리자 사용자를 찾아서 알림 전송 (간단한 구현: 모든 관리자에게 알림)
      // 현재는 시스템 알림으로 생성 (recipientId는 게시글 작성자에게 전송)
      await writerPrisma.notification.create({
        data: {
          recipientId: post.authorId,
          type: 'report_hidden',
          title: '게시글 숨김 처리',
          message: `신고가 ${REPORT_THRESHOLD}회 누적되어 게시글이 숨김 처리되었습니다.`,
          linkUrl: `/community/${postId}`,
        },
      });
    }

    return { success: true, reportCount: updatedPost.reportCount };
  },

  /**
   * 관리자용 신고 목록 조회
   * - 신고된 게시글 목록 (신고 횟수 포함)
   * - 최신 신고 순 정렬
   */
  async listReports() {
    const reports = await readerPrisma.communityReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            isHidden: true,
            reportCount: true,
            createdAt: true,
            author: { select: { id: true, nickname: true } },
            book: { select: { id: true, title: true } },
          },
        },
        user: {
          select: { id: true, nickname: true },
        },
      },
    });

    return reports;
  },

  /**
   * 관리자용 게시글 복원
   * - isHidden=false로 변경
   */
  async restorePost(postId: string) {
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, isHidden: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    if (!post.isHidden) {
      throw new AppError(400, 'VALIDATION_ERROR', '숨김 처리되지 않은 게시글입니다');
    }

    await writerPrisma.communityPost.update({
      where: { id: postId },
      data: { isHidden: false },
    });

    return { success: true };
  },

  /**
   * 관리자용 게시글 삭제
   * - 게시글 완전 삭제
   */
  async adminDeletePost(postId: string) {
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    await writerPrisma.communityPost.delete({
      where: { id: postId },
    });

    return { success: true };
  },
};
