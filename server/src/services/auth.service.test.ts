import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock PrismaClient - vi.hoisted ensures the mock is available before vi.mock hoisting
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { authService, AppError } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user with nickname only', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'expo-user@expo.local',
        passwordHash: null,
        nickname: 'tester',
        provider: 'expo',
        createdAt: new Date(),
      });

      const user = await authService.signup('tester');

      expect(user.nickname).toBe('tester');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: expect.stringMatching(/^expo_.+@expo\.local$/),
          nickname: 'tester',
          provider: 'expo',
        },
      });
    });

    it('should throw DUPLICATE_NICKNAME for existing nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.signup('tester'),
      ).rejects.toThrow(AppError);

      try {
        await authService.signup('tester');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('DUPLICATE_NICKNAME');
        expect((err as AppError).statusCode).toBe(409);
      }
    });
  });

  describe('login', () => {
    it('should return tokens for an existing nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        nickname: 'tester',
      });

      const result = await authService.login('tester');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw INVALID_CREDENTIALS for non-existent nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        await authService.login('unknown');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('INVALID_CREDENTIALS');
        expect((err as AppError).statusCode).toBe(401);
      }
    });

  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key';
      const validRefreshToken = jwt.sign(
        { userId: 'user-1', email: 'test@example.com' },
        refreshSecret,
        { expiresIn: '7d' },
      );

      const result = await authService.refreshToken(validRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('should throw INVALID_TOKEN for invalid refresh token', async () => {
      try {
        await authService.refreshToken('invalid-token');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('INVALID_TOKEN');
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it('should throw TOKEN_EXPIRED for expired refresh token', async () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key';
      const expiredToken = jwt.sign(
        { userId: 'user-1', email: 'test@example.com' },
        refreshSecret,
        { expiresIn: '0s' },
      );

      // Wait a moment for the token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        await authService.refreshToken(expiredToken);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid access token', async () => {
      const secret = process.env.JWT_SECRET || 'dev-secret-key';
      const validToken = jwt.sign(
        { userId: 'user-1', email: 'test@example.com' },
        secret,
        { expiresIn: '15m' },
      );

      const payload = await authService.validateToken(validToken);

      expect(payload.userId).toBe('user-1');
      expect(payload.email).toBe('test@example.com');
    });

    it('should throw INVALID_TOKEN for invalid token', async () => {
      try {
        await authService.validateToken('garbage-token');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('INVALID_TOKEN');
      }
    });

    it('should throw TOKEN_EXPIRED for expired access token', async () => {
      const secret = process.env.JWT_SECRET || 'dev-secret-key';
      const expiredToken = jwt.sign(
        { userId: 'user-1', email: 'test@example.com' },
        secret,
        { expiresIn: '0s' },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        await authService.validateToken(expiredToken);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });
});
