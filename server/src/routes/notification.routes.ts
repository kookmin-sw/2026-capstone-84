import { Router, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/notifications
 * 알림 목록 조회 (인증 필수, 커서 기반 페이지네이션)
 * - cursor: 페이지네이션 커서 (선택)
 * - limit: 결과 수 (선택)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

    const result = await notificationService.getByUser(req.user!.userId, cursor, limit);
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
 * GET /api/notifications/unread-count
 * 읽지 않은 알림 수 조회 (인증 필수)
 */
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ count });
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
 * PATCH /api/notifications/:id/read
 * 개별 알림 읽음 처리 (인증 필수)
 */
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAsRead(req.params.id as string, req.user!.userId);
    res.json({ success: true });
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
 * PATCH /api/notifications/read-all
 * 전체 알림 읽음 처리 (인증 필수)
 */
router.patch('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true });
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
