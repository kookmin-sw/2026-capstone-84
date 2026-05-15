import { Request, Response, NextFunction } from 'express';
import { AuthPayload } from '@shared/types';
import { AuthService } from '../services';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * optionalAuth 미들웨어: Authorization 헤더에 토큰이 있으면 검증하여 req.user에 설정, 없으면 통과 (게스트 허용)
 */
export function createOptionalAuth(authService: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 토큰 없음 → 게스트로 통과
      return next();
    }

    const token = authHeader.slice(7);

    try {
      const payload = authService.verifyToken(token);
      req.user = payload;
    } catch {
      // 유효하지 않은 토큰 → 401
      _res.status(401).json({ error: '유효하지 않은 토큰입니다' });
      return;
    }

    next();
  };
}

/**
 * requireAdmin 미들웨어: optionalAuth 통과 후 req.user.role이 'admin'이 아니면 403 반환
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: '관리자 권한이 필요합니다' });
    return;
  }

  next();
}
