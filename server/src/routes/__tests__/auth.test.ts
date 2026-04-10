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

  beforeEach(() => {
    const ctx = createApp();
    app = ctx.app;
    db = ctx.db;
  });

  afterEach(() => {
    db.close();
  });

  // --- POST /api/auth/register ---

  describe('POST /api/auth/register', () => {
    test('유효한 입력으로 회원가입 시 201 응답과 토큰/사용자 정보 반환', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123', confirmPassword: 'pass123', displayName: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        username: 'testuser',
        displayName: 'Test User',
        role: 'user',
      });
      expect(res.body.user.id).toBeDefined();
    });

    test('아이디가 비어있으면 400 응답 (Req 3.6)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: '', password: 'pass123', confirmPassword: 'pass123', displayName: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('아이디');
    });

    test('비밀번호가 비어있으면 400 응답 (Req 3.6)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '', confirmPassword: '', displayName: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('비밀번호');
    });

    test('표시 이름이 비어있으면 400 응답 (Req 3.6)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123', confirmPassword: 'pass123', displayName: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('표시 이름');
    });

    test('비밀번호 확인 불일치 시 400 응답 (Req 3.5)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123', confirmPassword: 'different', displayName: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('비밀번호가 일치하지 않습니다');
    });

    test('중복 아이디로 회원가입 시 409 응답 (Req 3.4)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123', confirmPassword: 'pass123', displayName: 'Test' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass456', confirmPassword: 'pass456', displayName: 'Test2' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('이미 사용 중인 아이디입니다');
    });
  });

  // --- POST /api/auth/login ---

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123', confirmPassword: 'pass123', displayName: 'Test User' });
    });

    test('유효한 자격 증명으로 로그인 시 200 응답과 토큰 반환 (Req 1.2)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'pass123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        username: 'testuser',
        displayName: 'Test User',
        role: 'user',
      });
    });

    test('아이디가 비어있으면 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'pass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('아이디');
    });

    test('비밀번호가 비어있으면 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('비밀번호');
    });

    test('잘못된 비밀번호로 로그인 시 401 응답 (Req 1.3)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
    });

    test('존재하지 않는 아이디로 로그인 시 401 응답 (Req 1.3)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'pass123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
    });
  });
});
