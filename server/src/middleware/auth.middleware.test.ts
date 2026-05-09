import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from './auth.middleware';
import { Response, NextFunction } from 'express';

// Mock PrismaClient before importing auth.service
vi.mock('../lib/prisma', () => ({
  writerPrisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
  readerPrisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

function createMockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('Auth Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should call next and set req.user for valid token', async () => {
    const token = jwt.sign({ userId: 'user-1', email: 'test@example.com' }, JWT_SECRET, { expiresIn: '15m' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = createMockRes();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(req.user!.email).toBe('test@example.com');
  });

  it('should return 401 when no Authorization header', async () => {
    const req = { headers: {} } as AuthRequest;
    const res = createMockRes();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_TOKEN', message: '인증 토큰이 필요합니다' },
    });
  });

  it('should return 401 for malformed Authorization header', async () => {
    const req = { headers: { authorization: 'NotBearer token' } } as AuthRequest;
    const res = createMockRes();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 for invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } } as AuthRequest;
    const res = createMockRes();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      }),
    );
  });

  it('should return 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'user-1', email: 'test@example.com' },
      JWT_SECRET,
      { expiresIn: '0s' },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    const req = { headers: { authorization: `Bearer ${expiredToken}` } } as AuthRequest;
    const res = createMockRes();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
      }),
    );
  });
});
