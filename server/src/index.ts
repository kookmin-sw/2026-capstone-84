import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { createDatabase, migrate } from './db';
import { RoomService, MessageService } from './services';
import { createRoomRouter } from './routes';
import { setupSocketIO } from './socket';

const PORT = process.env.PORT || 3000;

// 데이터베이스 초기화
const db = createDatabase();
migrate(db);

// Express 앱 생성 및 미들웨어 설정
const app = express();
app.use(cors());
app.use(express.json());

// REST API 라우터 마운트
const roomService = new RoomService(db);
const messageService = new MessageService(db);
app.use('/api/rooms', createRoomRouter(roomService, messageService));

// React 빌드 결과물 정적 파일 서빙
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// SPA 라우팅을 위한 폴백 핸들러
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// HTTP 서버 생성 및 Socket.IO 연결
const server = http.createServer(app);
setupSocketIO(server, db);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server };
