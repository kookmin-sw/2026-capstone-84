import { Router, Request, Response } from 'express';
import { authService, AppError } from '../services/auth.service';
import { SignupSchema, LoginSchema } from '../validators';
import { z } from 'zod';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, '리프레시 토큰이 필요합니다'),
});

const router = Router();

// GET /api/auth/check-nickname?nickname=xxx (인증 불필요)
router.get('/check-nickname', async (req: Request, res: Response) => {
  try {
    const nickname = (req.query.nickname as string)?.trim();
    if (!nickname || nickname.trim().length === 0) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '닉네임을 입력해주세요' },
      });
      return;
    }
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const existing = await prisma.user.findFirst({ where: { nickname } });
    await prisma.$disconnect();
    res.json({ available: !existing });
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

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const { nickname } = parsed.data;
    const user = await authService.signup(nickname);

    res.status(201).json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
    });
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

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const { nickname } = parsed.data;
    const tokens = await authService.login(nickname);

    res.json(tokens);
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

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0].message,
        },
      });
      return;
    }

    const { refreshToken } = parsed.data;
    const result = await authService.refreshToken(refreshToken);

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

// GET /api/auth/kakao - 카카오 로그인 페이지로 리다이렉트
router.get('/kakao', (_req: Request, res: Response) => {
  const kakaoClientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/auth/kakao/callback';
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  res.redirect(kakaoAuthUrl);
});

// GET /api/auth/kakao/callback - 카카오 콜백 처리
router.get('/kakao/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    // 프론트엔드 URL 자동 결정: 개발은 5173, 배포는 같은 호스트
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol;
    const isDev = host.includes('localhost') || host.includes('127.0.0.1');
    const frontendUrl = isDev ? `${protocol}://${host.replace(':3000', ':5173')}` : `${protocol}://${host}`;

    if (!code || typeof code !== 'string') {
      res.redirect(`${frontendUrl}/login?error=kakao_failed`);
      return;
    }

    const axios = (await import('axios')).default;
    const kakaoClientId = process.env.KAKAO_CLIENT_ID;
    const redirectUri = process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/auth/kakao/callback';

    // 인가 코드로 액세스 토큰 교환
    const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET;
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: kakaoClientId!,
      redirect_uri: redirectUri,
      code,
    };
    if (kakaoClientSecret) {
      tokenParams.client_secret = kakaoClientSecret;
    }
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token',
      new URLSearchParams(tokenParams).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    const kakaoAccessToken = tokenRes.data.access_token;
    const result = await authService.kakaoLogin(kakaoAccessToken);

    res.redirect(`${frontendUrl}/login?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&isNew=${result.isNew}`);
  } catch (err) {
    console.error('Kakao login error:', err);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol;
    const isDev = host.includes('localhost') || host.includes('127.0.0.1');
    const frontendUrl = isDev ? `${protocol}://${host.replace(':3000', ':5173')}` : `${protocol}://${host}`;
    res.redirect(`${frontendUrl}/login?error=kakao_failed`);
  }
});

export default router;
