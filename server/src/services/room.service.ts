import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatRoomSummary } from '@shared/types';
import type { RoomService as IRoomService } from '@shared/types';

export class RoomService implements IRoomService {
  constructor(private db: Database.Database) {}

  async createRoom(
    title: string,
    topic: string,
    creatorId: string,
    creatorName: string
  ): Promise<ChatRoom> {
    if (!title || !title.trim()) {
      throw new Error('Title is required');
    }
    if (!topic || !topic.trim()) {
      throw new Error('Topic is required');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO chat_rooms (id, title, topic, creator_id, creator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, title.trim(), topic.trim(), creatorId, creatorName, now);

    // 생성자 자동 참여 (Requirement 1.3)
    this.db.prepare(
      `INSERT INTO participants (room_id, user_id, user_name, joined_at)
       VALUES (?, ?, ?, ?)`
    ).run(id, creatorId, creatorName, now);

    return {
      id,
      title: title.trim(),
      topic: topic.trim(),
      creatorId,
      creatorName,
      createdAt: new Date(now),
    };
  }

  async getRooms(): Promise<ChatRoomSummary[]> {
    const rows = this.db.prepare(
      `SELECT r.id, r.title, r.topic, r.creator_name, r.created_at,
              COUNT(p.user_id) AS participant_count
       FROM chat_rooms r
       LEFT JOIN participants p ON r.id = p.room_id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    ).all() as Array<{
      id: string;
      title: string;
      topic: string;
      creator_name: string;
      created_at: string;
      participant_count: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      topic: row.topic,
      creatorName: row.creator_name,
      participantCount: row.participant_count,
      createdAt: new Date(row.created_at),
    }));
  }

  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    const row = this.db.prepare(
      `SELECT id, title, topic, creator_id, creator_name, created_at
       FROM chat_rooms WHERE id = ?`
    ).get(roomId) as {
      id: string;
      title: string;
      topic: string;
      creator_id: string;
      creator_name: string;
      created_at: string;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      topic: row.topic,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      createdAt: new Date(row.created_at),
    };
  }
}
