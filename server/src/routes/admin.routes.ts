import { Router, Response } from 'express';
import { communityReportService } from '../services/community-report.service';
import { discussionScheduleNotifierService } from '../services/discussion-schedule-notifier.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

// ===== 관리자 라우터 =====
// TODO: 현재는 authMiddleware만 사용하여 로그인한 사용자면 접근 가능.
// 추후 User 모델에 role 필드를 추가하고, 관리자 역할 검증 미들웨어를 구현해야 함.

const router = Router();

/**
 * GET /api/admin/reports
 * 신고 목록 조회 (관리자 인증 필수)
 */
router.get('/reports', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const reports = await communityReportService.listReports();
    res.json(reports);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' },
    });
  }
});

/**
 * PATCH /api/admin/posts/:id/restore
 * 게시글 복원 (관리자 인증 필수)
 */
router.patch('/posts/:id/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityReportService.restorePost(req.params.id as string);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' },
    });
  }
});

/**
 * DELETE /api/admin/posts/:id
 * 게시글 삭제 (관리자 인증 필수)
 */
router.delete('/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityReportService.adminDeletePost(req.params.id as string);
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' },
    });
  }
});

/**
 * POST /api/admin/send-schedule-notifications
 * D-1 독서토론 일정 알림 전송 (cron job 또는 스케줄러에서 호출)
 */
router.post('/send-schedule-notifications', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await discussionScheduleNotifierService.sendScheduleNotifications();
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' },
    });
  }
});

export default router;
