import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createDatabase, migrate } from '../../db';
import { RoomService } from '../../services/room.service';
import { MessageService } from '../../services/message.service';
import { createRoomRouter } from '../rooms';

function createApp() {
  const db = createDatabase(':memory:');
  migrate(db);
  const roomService = new RoomService(db);
  const messageService = new MessageService(db);
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', createRoomRouter(roomService, messageService));
  return { app, db, roomService, messageService };
}

describe('REST API - /api/rooms', () => {
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

  // --- POST /api/rooms (대화방 생성) ---

  describe('POST /api/rooms', () => {
    test('유효한 입력으로 대화방 생성 시 201 응답과 생성된 대화방 반환', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ title: 'Test Room', topic: 'Testing', creatorId: 'u1', creatorName: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Test Room',
        topic: 'Testing',
        creatorId: 'u1',
        creatorName: 'Alice',
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    test('빈 제목으로 생성 시 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ title: '', topic: 'Testing', creatorId: 'u1', creatorName: 'Alice' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('빈 주제로 생성 시 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ title: 'Room', topic: '', creatorId: 'u1', creatorName: 'Alice' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('공백만 있는 제목으로 생성 시 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ title: '   ', topic: 'Testing', creatorId: 'u1', creatorName: 'Alice' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('제목/주제 누락 시 400 응답 (Req 1.4)', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ creatorId: 'u1', creatorName: 'Alice' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // --- GET /api/rooms (대화방 목록 조회) ---

  describe('GET /api/rooms', () => {
    test('대화방이 없을 때 빈 배열 반환 (Req 2.4)', async () => {
      const res = await request(app).get('/api/rooms');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('생성된 대화방이 목록에 포함됨', async () => {
      await request(app)
        .post('/api/rooms')
        .send({ title: 'Room A', topic: 'Topic A', creatorId: 'u1', creatorName: 'Alice' });

      const res = await request(app).get('/api/rooms');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        title: 'Room A',
        topic: 'Topic A',
        creatorName: 'Alice',
      });
      expect(res.body[0].participantCount).toBe(1); // 생성자 자동 참여
    });

    test('여러 대화방 생성 시 최신순 정렬 (Req 2.3)', async () => {
      await request(app)
        .post('/api/rooms')
        .send({ title: 'First', topic: 'T1', creatorId: 'u1', creatorName: 'Alice' });
      await request(app)
        .post('/api/rooms')
        .send({ title: 'Second', topic: 'T2', creatorId: 'u2', creatorName: 'Bob' });

      const res = await request(app).get('/api/rooms');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // 최신순이므로 Second가 먼저
      expect(res.body[0].title).toBe('Second');
      expect(res.body[1].title).toBe('First');
    });
  });

  // --- GET /api/rooms/:roomId (대화방 상세 조회) ---

  describe('GET /api/rooms/:roomId', () => {
    test('존재하는 대화방 조회 시 200 응답', async () => {
      const createRes = await request(app)
        .post('/api/rooms')
        .send({ title: 'Room', topic: 'Topic', creatorId: 'u1', creatorName: 'Alice' });

      const res = await request(app).get(`/api/rooms/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Room');
    });

    test('존재하지 않는 대화방 조회 시 404 응답 (Req 2.4)', async () => {
      const res = await request(app).get('/api/rooms/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Room not found');
    });
  });

  // --- GET /api/rooms/:roomId/messages (메시지 이력 조회) ---

  describe('GET /api/rooms/:roomId/messages', () => {
    test('메시지가 없는 대화방의 메시지 조회 시 빈 배열 반환', async () => {
      const createRes = await request(app)
        .post('/api/rooms')
        .send({ title: 'Room', topic: 'Topic', creatorId: 'u1', creatorName: 'Alice' });

      const res = await request(app).get(`/api/rooms/${createRes.body.id}/messages`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
