import { Router, Response } from 'express';
import { z } from 'zod';
import { communityPostService } from '../services/community-post.service';
import { communityCommentService } from '../services/community-comment.service';
import { communityLikeService } from '../services/community-like.service';
import { communitySearchService } from '../services/community-search.service';
import { communityReportService } from '../services/community-report.service';
import { spoilerService } from '../services/spoiler.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { CATEGORY_KEYS, CategoryKey, SPOILER_FILTER_MODES, SpoilerFilterMode } from '../types/community';

// ===== Zod 스키마 =====

const CreatePostSchema = z.object({
  bookId: z.string().min(1, '책을 선택해주세요'),
  content: z.string().min(1, '글 내용을 입력해주세요'),
  pageNumber: z.number().int().nonnegative().optional(),
  category: z.enum(CATEGORY_KEYS as unknown as [string, ...string[]]).optional(),
});

const CreateCommentSchema = z.object({
  content: z.string().min(1, '댓글 내용을 입력해주세요'),
});

const ReportPostSchema = z.object({
  reason: z.string().min(1, '신고 사유를 입력해주세요'),
});

// ===== 라우터 =====

const router = Router();

/**
 * GET /api/community/search
 * 커뮤니티 게시글 검색 (인증 선택)
 * - q: 검색어 (필수)
 * - cursor: 페이지네이션 오프셋 (선택)
 * - limit: 결과 수 (선택, 기본 20)
 */
router.get('/search', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '검색어를 입력해주세요',
        },
      });
      return;
    }

    const cursor = typeof req.query.cursor === 'string' ? parseInt(req.query.cursor, 10) : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

    const result = await communitySearchService.search(q, cursor, limit);
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
 * POST /api/community/posts
 * 게시글 작성 (인증 필수)
 */
router.post('/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const post = await communityPostService.createPost(req.user!.userId, {
      ...parsed.data,
      category: parsed.data.category as CategoryKey | undefined,
    });
    res.status(201).json(post);
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
 * GET /api/community/posts
 * 게시글 목록 조회 (인증 선택, 커서 페이지네이션)
 * - spoilerFilter 쿼리 파라미터로 스포일러 필터 적용 가능
 */
router.get('/posts', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const spoilerFilter = typeof req.query.spoilerFilter === 'string' ? req.query.spoilerFilter : undefined;

    // 카테고리 유효성 검증
    if (category && !CATEGORY_KEYS.includes(category as any)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '유효하지 않은 카테고리입니다',
        },
      });
      return;
    }

    // spoilerFilter 유효성 검증
    if (spoilerFilter && !SPOILER_FILTER_MODES.includes(spoilerFilter as any)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '유효하지 않은 스포일러 필터 모드입니다',
        },
      });
      return;
    }

    const result = await communityPostService.listPosts({
      cursor,
      limit,
      category,
    });

    // 스포일러 필터 적용 (로그인한 사용자만)
    if (req.user && spoilerFilter && spoilerFilter !== 'off') {
      const filteredData = await spoilerService.filterPosts(
        result.data,
        req.user.userId,
        spoilerFilter as SpoilerFilterMode,
      );
      res.json({ ...result, data: filteredData });
      return;
    }

    // 로그인한 사용자이고 spoilerFilter 파라미터가 없으면 사용자 설정 적용
    if (req.user && !spoilerFilter) {
      const userMode = await spoilerService.getUserSetting(req.user.userId);
      if (userMode !== 'off') {
        const filteredData = await spoilerService.filterPosts(
          result.data,
          req.user.userId,
          userMode,
        );
        res.json({ ...result, data: filteredData });
        return;
      }
    }

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
 * GET /api/community/posts/:id
 * 게시글 상세 조회 (인증 선택)
 */
router.get('/posts/:id', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const post = await communityPostService.getPostById(req.params.id as string);
    res.json(post);
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
 * DELETE /api/community/posts/:id
 * 게시글 삭제 (인증 필수, 작성자 확인)
 */
router.delete('/posts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityPostService.deletePost(req.params.id as string, req.user!.userId);
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

// ===== 댓글 라우터 =====

/**
 * GET /api/community/posts/:id/comments
 * 게시글별 댓글 목록 조회 (인증 선택)
 */
router.get('/posts/:id/comments', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const comments = await communityCommentService.getCommentsByPostId(req.params.id as string);
    res.json(comments);
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
 * POST /api/community/posts/:id/comments
 * 댓글 작성 (인증 필수)
 */
router.post('/posts/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const comment = await communityCommentService.createComment(req.user!.userId, {
      postId: req.params.id as string,
      content: parsed.data.content,
    });
    res.status(201).json(comment);
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
 * POST /api/community/comments/:id/replies
 * 대댓글 작성 (인증 필수)
 */
router.post('/comments/:id/replies', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const reply = await communityCommentService.createReply(req.user!.userId, {
      parentId: req.params.id as string,
      content: parsed.data.content,
    });
    res.status(201).json(reply);
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
 * DELETE /api/community/comments/:id
 * 댓글 삭제 (인증 필수, 작성자 확인)
 */
router.delete('/comments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityCommentService.deleteComment(req.params.id as string, req.user!.userId);
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
 * DELETE /api/community/replies/:id
 * 대댓글 삭제 (인증 필수, 작성자 확인)
 * - 대댓글도 CommunityComment 레코드이므로 동일한 deleteComment 사용
 */
router.delete('/replies/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityCommentService.deleteComment(req.params.id as string, req.user!.userId);
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

// ===== 좋아요 라우터 =====

/**
 * POST /api/community/posts/:id/like
 * 좋아요 토글 (인증 필수)
 */
router.post('/posts/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityLikeService.toggleLike(req.params.id as string, req.user!.userId);
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
 * GET /api/community/posts/:id/like
 * 좋아요 상태 확인 (인증 필수)
 */
router.get('/posts/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await communityLikeService.getLikeStatus(req.params.id as string, req.user!.userId);
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

// ===== 신고 라우터 =====

/**
 * POST /api/community/posts/:id/report
 * 게시글 신고 (인증 필수)
 */
router.post('/posts/:id/report', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = ReportPostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const result = await communityReportService.reportPost(
      req.params.id as string,
      req.user!.userId,
      { reason: parsed.data.reason },
    );
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
