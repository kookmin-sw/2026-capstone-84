import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { RoomService } from '../services/room.service';
import { MessageService } from '../services/message.service';
import { AuthService } from '../services/auth.service';
import { createOptionalAuth, requireAdmin } from '../middleware/auth';

export function createRoomRouter(
  roomService: RoomService,
  messageService: MessageService,
  authService?: AuthService,
  io?: Server
): Router {
  const router = Router();

  // POST /api/rooms - 대화방 생성
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { title, topic, creatorId, creatorName } = req.body;
      const room = await roomService.createRoom(title, topic, creatorId, creatorName);
      res.status(201).json(room);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/rooms - 대화방 목록 조회 (최신순)
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const rooms = await roomService.getRooms();
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/rooms/my - 내가 참여 중인 대화방 목록
  router.get('/my', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const rooms = await roomService.getRoomsByUserId(userId);
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/rooms/:roomId - 대화방 상세 조회
  router.get('/:roomId', async (req: Request<{ roomId: string }>, res: Response) => {
    try {
      const room = await roomService.getRoomById(req.params.roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.json(room);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/rooms/:roomId/messages - 메시지 이력 조회
  router.get('/:roomId/messages', async (req: Request<{ roomId: string }>, res: Response) => {
    try {
      const messages = await messageService.getMessagesByRoom(req.params.roomId);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/rooms/:roomId - 대화방 삭제 (관리자 전용)
  if (authService) {
    const optionalAuth = createOptionalAuth(authService);
    router.delete('/:roomId', optionalAuth, requireAdmin, async (req: Request<{ roomId: string }>, res: Response) => {
      try {
        const room = await roomService.getRoomById(req.params.roomId);
        if (!room) {
          return res.status(404).json({ error: 'Room not found' });
        }

        await roomService.deleteRoom(req.params.roomId);

        // Socket.IO로 room:deleted 이벤트 브로드캐스트
        if (io) {
          io.emit('room:deleted', { roomId: req.params.roomId });
        }

        res.status(200).json({ message: 'Room deleted' });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  return router;
}
