import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // POST /api/auth/register - 회원가입
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { displayName, email } = req.body;

      // 빈 필드 검증
      if (!displayName || !displayName.trim()) {
        res.status(400).json({ error: '표시 이름을 입력해주세요' });
        return;
      }
      if (!email || !email.trim()) {
        res.status(400).json({ error: '이메일을 입력해주세요' });
        return;
      }

      const result = await authService.register(displayName.trim(), email.trim());
      res.status(201).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  });

  // POST /api/auth/login - 로그인
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // 빈 필드 검증
      if (!username || !username.trim()) {
        res.status(400).json({ error: '아이디를 입력해주세요' });
        return;
      }
      if (!password) {
        res.status(400).json({ error: '비밀번호를 입력해주세요' });
        return;
      }

      const result = await authService.login(username.trim(), password);
      res.json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  });

  // POST /api/auth/convert - 게스트 → 회원 전환
  router.post('/convert', async (req: Request, res: Response) => {
    try {
      const { guestUserId, displayName, email } = req.body;

      if (!guestUserId || !guestUserId.trim()) {
        res.status(400).json({ error: '게스트 사용자 ID를 입력해주세요' });
        return;
      }
      if (!displayName || !displayName.trim()) {
        res.status(400).json({ error: '표시 이름을 입력해주세요' });
        return;
      }
      if (!email || !email.trim()) {
        res.status(400).json({ error: '이메일을 입력해주세요' });
        return;
      }

      const result = await authService.convert(guestUserId.trim(), displayName.trim(), email.trim());
      res.status(201).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  });

  // POST /api/auth/reissue - 자격증명 재발급
  router.post('/reissue', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || !email.trim()) {
        res.status(400).json({ error: '이메일을 입력해주세요' });
        return;
      }

      await authService.reissue(email.trim());
      res.json({ message: '입력하신 이메일로 새 자격증명을 발송했습니다' });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  });

  return router;
}
