import { Router, Response } from 'express';
import { z } from 'zod';
import { readingMemoService } from '../services/reading-memo.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const CreateMemoSchema = z.object({
  content: z.string().min(1, '메모 내용을 입력해주세요'),
  pageNumber: z.number().int().min(0).optional(),
});

const UpdateMemoSchema = z.object({
  content: z.string().min(1, '메모 내용을 입력해주세요'),
  pageNumber: z.number().int().min(0).optional(),
});

const UpdatePageSchema = z.object({
  currentPage: z.number().int().min(0, '페이지는 0 이상이어야 합니다'),
});

const router = Router();

// GET /api/me/reading-status/:id/memos
router.get('/:id/memos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const memos = await readingMemoService.getMemos(req.user!.userId, id);
    res.json(memos);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// POST /api/me/reading-status/:id/memos
router.post('/:id/memos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = CreateMemoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }
    const memo = await readingMemoService.createMemo(
      req.user!.userId,
      id,
      parsed.data.content,
      parsed.data.pageNumber,
    );
    res.status(201).json(memo);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// PATCH /api/me/reading-status/:id/memos/:memoId
router.patch('/:id/memos/:memoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const memoId = req.params.memoId as string;
    const parsed = UpdateMemoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }
    const memo = await readingMemoService.updateMemo(
      memoId,
      req.user!.userId,
      parsed.data.content,
      parsed.data.pageNumber,
    );
    res.json(memo);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// DELETE /api/me/reading-status/:id/memos/:memoId
router.delete('/:id/memos/:memoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const memoId = req.params.memoId as string;
    await readingMemoService.deleteMemo(memoId, req.user!.userId);
    res.json({ message: '메모가 삭제되었습니다' });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// PATCH /api/me/reading-status/:id/page
router.patch('/:id/page', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = UpdatePageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }
    const result = await readingMemoService.updateCurrentPage(
      id,
      req.user!.userId,
      parsed.data.currentPage,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// GET /api/me/reading-status/:id/progress-logs
router.get('/:id/progress-logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const logs = await readingMemoService.getProgressLogs(id, req.user!.userId);
    res.json(logs);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

export default router;
