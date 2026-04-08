import http from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@shared/types';
import { MessageService, ParticipantService } from '../services';

interface RoomMembership {
  roomId: string;
  userId: string;
  userName: string;
}

/** Socket별 참여 중인 방 목록 추적 */
const socketRooms = new Map<string, RoomMembership[]>();

export function setupSocketIO(
  server: http.Server,
  db: Database.Database
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: '*' },
  });

  const participantService = new ParticipantService(db);
  const messageService = new MessageService(db);

  io.on('connection', (socket) => {
    socketRooms.set(socket.id, []);

    socket.on('room:join', async (payload) => {
      try {
        const { roomId, userId, userName } = payload;
        const { participantCount } = await participantService.joinRoom(roomId, userId, userName);

        socket.join(roomId);

        // 참여 정보 추적
        const memberships = socketRooms.get(socket.id) || [];
        memberships.push({ roomId, userId, userName });
        socketRooms.set(socket.id, memberships);

        // 다른 참여자에게 알림 (sender 제외)
        socket.to(roomId).emit('room:user-joined', {
          userId,
          userName,
          participantCount,
        });
      } catch (error) {
        console.error('room:join error:', error);
      }
    });

    socket.on('room:leave', async (payload) => {
      try {
        const { roomId, userId } = payload;

        // 추적 목록에서 userName 조회
        const memberships = socketRooms.get(socket.id) || [];
        const membership = memberships.find(
          (m) => m.roomId === roomId && m.userId === userId
        );
        const userName = membership?.userName || '';

        const { participantCount } = await participantService.leaveRoom(roomId, userId);

        socket.leave(roomId);

        // 추적 목록에서 제거
        socketRooms.set(
          socket.id,
          memberships.filter((m) => !(m.roomId === roomId && m.userId === userId))
        );

        // 다른 참여자에게 알림 (sender 제외)
        socket.to(roomId).emit('room:user-left', {
          userId,
          userName,
          participantCount,
        });
      } catch (error) {
        console.error('room:leave error:', error);
      }
    });

    socket.on('message:send', async (payload) => {
      try {
        const { roomId, userId, userName, content } = payload;
        const message = await messageService.sendMessage(roomId, userId, userName, content);

        // 같은 방의 모든 참여자에게 전달 (sender 포함)
        io.to(roomId).emit('message:new', message);
      } catch (error) {
        console.error('message:send error:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const memberships = socketRooms.get(socket.id) || [];

        for (const { roomId, userId, userName } of memberships) {
          const { participantCount } = await participantService.leaveRoom(roomId, userId);

          // 남은 참여자에게 퇴장 알림
          socket.to(roomId).emit('room:user-left', {
            userId,
            userName,
            participantCount,
          });
        }

        socketRooms.delete(socket.id);
      } catch (error) {
        console.error('disconnect error:', error);
      }
    });
  });

  return io;
}
