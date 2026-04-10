import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { createDatabase, migrate } from './db';
import { RoomService, MessageService, AuthService, GuestCleanupService, createEmailService } from './services';
import { createRoomRouter, createAuthRouter } from './routes';
import { setupSocketIO } from './socket';

const PORT = process.env.PORT || 3000;

// 데이터베이스 초기화
const db = createDatabase();
migrate(db);

// 이메일 서비스 초기화
const emailService = createEmailService();

// 인증 서비스 초기화 및 운영자 계정 생성
const authService = new AuthService(db, emailService);
authService.ensureAdminExists();

// 비활성 게스트 참여자 정리
const guestCleanupService = new GuestCleanupService(db);
guestCleanupService.cleanupInactiveGuests();

// Express 앱 생성 및 미들웨어 설정
const app = express();
app.use(cors());
app.use(express.json());

// HTTP 서버 생성 및 Socket.IO 연결
const server = http.createServer(app);
const io = setupSocketIO(server, db);

// REST API 라우터 마운트
const roomService = new RoomService(db);
const messageService = new MessageService(db);
app.use('/api/auth', createAuthRouter(authService));
app.use('/api/rooms', createRoomRouter(roomService, messageService, authService, io));

// React 빌드 결과물 정적 파일 서빙
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// SPA 라우팅을 위한 폴백 핸들러
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server };
