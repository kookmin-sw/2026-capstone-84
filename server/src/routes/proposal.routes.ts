import { Router, Response } from 'express';
import { proposalService } from '../services/proposal.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/groups/:groupId/proposals - 주제 제안 목록
router.get('/groups/:groupId/proposals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposals = await proposalService.listByGroup(req.params.groupId as string);
    res.json(proposals);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// POST /api/groups/:groupId/proposals - 주제 제안 생성
router.post('/groups/:groupId/proposals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, memoId } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '주제 제목을 입력해주세요' } });
      return;
    }
    const proposal = await proposalService.create(req.params.groupId as string, req.user!.userId, { title: title.trim(), content, memoId });
    res.status(201).json(proposal);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// POST /api/proposals/:id/open - 토론 개최 (방장)
router.post('/proposals/:id/open', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const discussion = await proposalService.openDiscussion(req.params.id as string, req.user!.userId);
    res.status(201).json(discussion);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// DELETE /api/proposals/:id - 제안 삭제
router.delete('/proposals/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await proposalService.delete(req.params.id as string, req.user!.userId);
    res.json({ message: '제안이 삭제되었습니다' });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// GET /api/proposals/:id/comments - 제안의 의견 목록
router.get('/proposals/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const comments = await proposalService.getComments(req.params.id as string);
    res.json(comments);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// POST /api/proposals/:id/comments - 제안에 의견 작성
router.post('/proposals/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '의견 내용을 입력해주세요' } });
      return;
    }
    const comment = await proposalService.addComment(req.params.id as string, req.user!.userId, content.trim());
    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// POST /api/proposal-comments/:id/replies - 제안 의견에 답글
router.post('/proposal-comments/:id/replies', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '댓글 내용을 입력해주세요' } });
      return;
    }
    const reply = await proposalService.addReply(req.params.id as string, req.user!.userId, content.trim());
    res.status(201).json(reply);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// GET /api/proposals/:id - 제안 단건 조회
router.get('/proposals/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = await proposalService.getById(req.params.id as string);
    res.json(proposal);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

export default router;
