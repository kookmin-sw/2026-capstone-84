import { Router, Request, Response } from 'express';
import { RoomService } from '../services/room.service';
import { MessageService } from '../services/message.service';

export function createRoomRouter(
  roomService: RoomService,
  messageService: MessageService
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

  return router;
}
