import { Router, Response } from 'express';
import multer from 'multer';
import { mypageService } from '../services/mypage.service';
import { AppError } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { storageService } from '../services/storage.service';

import { UpdateNicknameSchema } from '../validators';

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

export default router;
