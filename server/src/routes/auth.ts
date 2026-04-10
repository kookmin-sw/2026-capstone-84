import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // POST /api/auth/register - 회원가입
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, confirmPassword, displayName } = req.body;

      // 빈 필드 검증
      if (!username || !username.trim()) {
        res.status(400).json({ error: '아이디를 입력해주세요' });
        return;
      }
      if (!password) {
        res.status(400).json({ error: '비밀번호를 입력해주세요' });
        return;
      }
      if (!displayName || !displayName.trim()) {
        res.status(400).json({ error: '표시 이름을 입력해주세요' });
        return;
      }

      // 비밀번호 확인 불일치
      if (password !== confirmPassword) {
        res.status(400).json({ error: '비밀번호가 일치하지 않습니다' });
        return;
      }

      const result = await authService.register(username.trim(), password, displayName.trim());
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

  return router;
}
