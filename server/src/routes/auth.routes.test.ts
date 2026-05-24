import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

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

import authRouter from './auth.routes';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should return 201 for valid signup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'expo-user@expo.local',
        passwordHash: null,
        nickname: 'tester',
        createdAt: new Date('2024-01-01'),
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ nickname: 'tester' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.nickname).toBe('tester');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for missing nickname', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for too long nickname', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ nickname: 'a'.repeat(51) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ nickname: 'tester' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_NICKNAME');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return tokens for valid login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        nickname: 'tester',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ nickname: 'tester' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for unknown nickname', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ nickname: 'unknown' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key';
      const refreshToken = jwt.sign(
        { userId: 'user-1', email: 'test@example.com' },
        refreshSecret,
        { expiresIn: '7d' },
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 for missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
