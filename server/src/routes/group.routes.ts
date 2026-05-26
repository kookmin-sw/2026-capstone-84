import { Router, Response } from 'express';
import { groupService } from '../services/group.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { CreateGroupSchema, UpdateGroupSchema } from '../validators';

const router = Router();

// GET /api/groups
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const searchType = typeof req.query.searchType === 'string' ? req.query.searchType : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 30;

    const userId = req.user?.userId;
    const result = await groupService.list({ search, searchType, sort, page, limit }, userId);
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

// POST /api/groups
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const group = await groupService.create(parsed.data, req.user!.userId);
    res.status(201).json(group);
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

// GET /api/groups/:id
router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const detail = await groupService.getDetail(req.params.id as string, req.user?.userId || '');
    res.json(detail);
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

// POST /api/groups/:id/join
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { password, inviteToken } = req.body || {};
    await groupService.join(req.params.id as string, req.user!.userId, password, inviteToken);
    res.json({ message: '모임에 참여했습니다' });
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

// PUT /api/groups/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }
    const updated = await groupService.update(req.params.id as string, req.user!.userId, parsed.data);
    res.json(updated);
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

// PATCH /api/groups/:id/progress
router.patch('/:id/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = req.body.readingProgress;
    if (typeof page !== 'number' || page < 0) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '유효한 페이지 수를 입력해주세요' },
      });
      return;
    }
    const updated = await groupService.updateProgress(req.params.id as string, req.user!.userId, page);
    res.json(updated);
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

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await groupService.leave(req.params.id as string, req.user!.userId);
    res.json({ message: '모임에서 나갔습니다' });
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

// DELETE /api/groups/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await groupService.delete(req.params.id as string, req.user!.userId);
    res.json({ message: '모임이 삭제되었습니다' });
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
