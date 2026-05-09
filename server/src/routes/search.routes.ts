import { Router, Response } from 'express';
import { searchService } from '../services/search.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/search?q={query}&type={discussion|memo}&page={page}&pageSize={pageSize}
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    // 검색 비활성화 시 빈 결과 반환
    if (!searchService.isEnabled()) {
      res.json({ hits: [], total: 0, page, pageSize, took: 0 });
      return;
    }

    // 검색어가 비어있으면 빈 결과 반환
    if (!q) {
      res.json({ hits: [], total: 0, page, pageSize, took: 0 });
      return;
    }

    // type 유효성 검증
    const validTypes = ['discussion', 'memo'] as const;
    const searchType = type && validTypes.includes(type as any)
      ? (type as 'discussion' | 'memo')
      : undefined;

    const result = await searchService.search(q, {
      type: searchType,
      page,
      pageSize,
    });

    res.json({
      hits: result.hits,
      total: result.total,
      page,
      pageSize,
      took: result.took,
    });
  } catch (err) {
    console.error('[Search] search API error:', err);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '검색 중 오류가 발생했습니다' },
    });
  }
});

export default router;
