import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createDatabase, migrate } from '../../db';
import { AuthService } from '../../services/auth.service';
import { createAuthRouter } from '../auth';

function createApp() {
  const db = createDatabase(':memory:');
  migrate(db);
  const authService = new AuthService(db);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(authService));
  return { app, db, authService };
}

describe('REST API - /api/auth', () => {
  let db: Database.Database;
  let app: express.Express;
  let authService: AuthService;

  beforeEach(() => {
    const ctx = createApp();
    app = ctx.app;
    db = ctx.db;
    authService = ctx.authService;
  });

  afterEach(() => {
    db.close();
  });

  // --- POST /api/auth/login ---
  // Note: POST /api/auth/register endpoint tests are deferred to task 6.1
  // when the router is updated to the new (displayName, email) contract.

  describe('POST /api/auth/login', () => {
    let generatedUsername: string;
    let generatedPassword: string;

    beforeEach(async () => {
      const result = await authService.register('Test User', 'test@example.com');
      generatedUsername = result.generatedUsername;
      generatedPassword = result.generatedPassword;
    });

    test('유효한 자격 증명으로 로그인 시 200 응답과 토큰 반환', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: generatedUsername, password: generatedPassword });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        username: generatedUsername,
        displayName: 'Test User',
        role: 'user',
      });
    });

    test('아이디가 비어있으면 400 응답', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('아이디');
    });

    test('비밀번호가 비어있으면 400 응답', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: generatedUsername, password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('비밀번호');
    });

    test('잘못된 비밀번호로 로그인 시 401 응답', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: generatedUsername, password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
    });

    test('존재하지 않는 아이디로 로그인 시 401 응답', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'pass123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
    });
  });
});
