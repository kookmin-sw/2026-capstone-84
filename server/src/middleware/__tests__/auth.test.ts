import { Request, Response, NextFunction } from 'express';
import { createOptionalAuth, requireAdmin } from '../auth';
import { AuthService } from '../../services';
import { AuthPayload } from '@shared/types';
import Database from 'better-sqlite3';
import { createDatabase, migrate } from '../../db';

describe('JWT Auth Middleware', () => {
  let db: Database.Database;
  let authService: AuthService;
  let optionalAuth: ReturnType<typeof createOptionalAuth>;

  beforeAll(() => {
    db = createDatabase(':memory:');
    migrate(db);
    authService = new AuthService(db);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    optionalAuth = createOptionalAuth(authService);
  });

  function mockReq(headers: Record<string, string> = {}, user?: AuthPayload): Partial<Request> {
    return { headers, user } as Partial<Request>;
  }

  function mockRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  describe('optionalAuth', () => {
    it('should call next without setting req.user when no Authorization header', () => {
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      optionalAuth(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should call next without setting req.user when Authorization header does not start with Bearer', () => {
      const req = mockReq({ authorization: 'Basic abc123' });
      const res = mockRes();
      const next = jest.fn();

      optionalAuth(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should set req.user when valid Bearer token is provided', async () => {
      const { token } = await authService.register('testuser', 'password123', 'Test User');
      const req = mockReq({ authorization: `Bearer ${token}` });
      const res = mockRes();
      const next = jest.fn();

      optionalAuth(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user!.username).toBe('testuser');
      expect(req.user!.displayName).toBe('Test User');
      expect(req.user!.role).toBe('user');
    });

    it('should return 401 when invalid token is provided', () => {
      const req = mockReq({ authorization: 'Bearer invalid-token' });
      const res = mockRes();
      const next = jest.fn();

      optionalAuth(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: '유효하지 않은 토큰입니다' });
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 when req.user is not set (guest)', () => {
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      requireAdmin(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: '관리자 권한이 필요합니다' });
    });

    it('should return 403 when req.user.role is not admin', () => {
      const userPayload: AuthPayload = {
        userId: 'user-1',
        username: 'normaluser',
        displayName: 'Normal User',
        role: 'user',
      };
      const req = mockReq({}, userPayload);
      const res = mockRes();
      const next = jest.fn();

      requireAdmin(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next when req.user.role is admin', () => {
      const adminPayload: AuthPayload = {
        userId: 'admin-1',
        username: 'admin',
        displayName: '관리자',
        role: 'admin',
      };
      const req = mockReq({}, adminPayload);
      const res = mockRes();
      const next = jest.fn();

      requireAdmin(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });
});
