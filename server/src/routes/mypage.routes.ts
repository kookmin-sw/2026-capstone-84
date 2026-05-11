import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { mypageService } from '../services/mypage.service';
import { spoilerService } from '../services/spoiler.service';
import { readingStatusService } from '../services/reading-status.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { storageService } from '../services/storage.service';
import { SPOILER_FILTER_MODES } from '../types/community';

import { UpdateNicknameSchema } from '../validators';

// ===== Zod 스키마 =====

const UpdateSpoilerSettingSchema = z.object({
  mode: z.enum(SPOILER_FILTER_MODES as unknown as [string, ...string[]]),
});

const READING_STATUS_VALUES = ['reading', 'completed', 'want_to_read'] as const;

const AddReadingStatusSchema = z.object({
  bookId: z.string().min(1, '책 ID가 필요합니다'),
  bookTitle: z.string().optional(),
  bookAuthor: z.string().optional(),
  bookCoverImageUrl: z.string().optional(),
  bookIsbn: z.string().optional(),
  status: z.enum(READING_STATUS_VALUES),
});

const UpdateReadingStatusSchema = z.object({
  status: z.enum(READING_STATUS_VALUES),
});

// 파일 업로드 설정 - memoryStorage를 사용하여 buffer로 받음
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// GET /api/me/check-nickname?nickname=xxx
router.get('/check-nickname', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const nickname = req.query.nickname as string;
    if (!nickname || nickname.length === 0) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '닉네임을 입력해주세요' },
      });
      return;
    }
    const result = await mypageService.checkNickname(nickname, req.user!.userId);
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

// PATCH /api/me/nickname
router.patch('/nickname', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateNicknameSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }
    const profile = await mypageService.updateNickname(req.user!.userId, parsed.data.nickname);
    res.json(profile);
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

// GET /api/me/profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await mypageService.getProfile(req.user!.userId);
    res.json(profile);
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

// GET /api/me/groups
router.get('/groups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groups = await mypageService.getMyGroups(req.user!.userId);
    res.json(groups);
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

// GET /api/me/memos
router.get('/memos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const memos = await mypageService.getMyMemos(req.user!.userId);
    res.json(memos);
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

// GET /api/me/discussions
router.get('/discussions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const discussions = await mypageService.getMyDiscussions(req.user!.userId);
    res.json(discussions);
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

// PATCH /api/me/profile-image
router.patch('/profile-image', authMiddleware, upload.single('profileImage'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '이미지 파일을 선택해주세요' } });
      return;
    }
    // storageService가 S3/로컬 분기를 내부적으로 처리
    const profileImageUrl = await storageService.uploadFile(
      req.file.buffer,
      req.user!.userId,
      req.file.originalname,
      req.file.mimetype,
    );
    const profile = await mypageService.updateProfileImage(req.user!.userId, profileImageUrl);
    res.json(profile);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// PATCH /api/me/profile-image-reset
router.patch('/profile-image-reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await mypageService.updateProfileImage(req.user!.userId, '');
    res.json(profile);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// PATCH /api/me/password
router.patch('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '현재 비밀번호와 새 비밀번호를 입력해주세요' } });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '새 비밀번호는 8자 이상이어야 합니다' } });
      return;
    }
    await mypageService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ message: '비밀번호가 변경되었습니다' });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// DELETE /api/me/account
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await mypageService.softDeleteAccount(req.user!.userId);
    res.json({ message: '회원 탈퇴가 완료되었습니다' });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }
});

// GET /api/me/recommended-groups
router.get('/recommended-groups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groups = await mypageService.getRecommendedGroups(req.user!.userId);
    res.json(groups);
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

// ===== 스포일러 필터 설정 =====

/**
 * GET /api/me/spoiler-setting
 * 사용자의 스포일러 필터 설정 조회 (인증 필수)
 */
router.get('/spoiler-setting', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mode = await spoilerService.getUserSetting(req.user!.userId);
    res.json({ mode });
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
 * PATCH /api/me/spoiler-setting
 * 사용자의 스포일러 필터 설정 변경 (인증 필수)
 */
router.patch('/spoiler-setting', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateSpoilerSettingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '유효하지 않은 스포일러 필터 모드입니다',
        },
      });
      return;
    }

    await spoilerService.updateSetting(req.user!.userId, parsed.data.mode as any);
    const mode = await spoilerService.getUserSetting(req.user!.userId);
    res.json({ mode });
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

// ===== 독서 상태 관리 =====

/**
 * GET /api/me/reading-status
 * 독서 상태 목록 조회 (인증 필수, status 쿼리 파라미터로 필터링)
 */
router.get('/reading-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    if (status && !READING_STATUS_VALUES.includes(status as any)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 독서 상태입니다' },
      });
      return;
    }
    const statuses = await readingStatusService.getReadingStatuses(
      req.user!.userId,
      status as any,
    );
    res.json(statuses);
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
 * POST /api/me/reading-status
 * 책을 독서 목록에 추가 (인증 필수)
 */
router.post('/reading-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = AddReadingStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }
    const result = await readingStatusService.addBook(
      req.user!.userId,
      parsed.data.bookId,
      parsed.data.status,
      {
        title: parsed.data.bookTitle,
        author: parsed.data.bookAuthor,
        coverImageUrl: parsed.data.bookCoverImageUrl,
        isbn: parsed.data.bookIsbn,
      },
    );
    res.status(201).json(result);
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
 * PATCH /api/me/reading-status/:id
 * 독서 상태 변경 (인증 필수)
 */
router.patch('/reading-status/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = UpdateReadingStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      });
      return;
    }
    const result = await readingStatusService.updateStatus(
      req.params.id as string,
      req.user!.userId,
      parsed.data.status,
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

/**
 * DELETE /api/me/reading-status/:id
 * 독서 목록에서 책 제거 (인증 필수)
 */
router.delete('/reading-status/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await readingStatusService.removeBook(req.params.id as string, req.user!.userId);
    res.json({ message: '독서 목록에서 제거되었습니다' });
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
