import Database from 'better-sqlite3';
import { Participant } from '@shared/types';
import type { ParticipantService as IParticipantService } from '@shared/types';

export class ParticipantService implements IParticipantService {
  constructor(private db: Database.Database) {}

  async joinRoom(
    roomId: string,
    userId: string,
    userName: string
  ): Promise<{ participantCount: number }> {
    // 중복 참여 멱등성 보장: INSERT OR IGNORE
    this.db.prepare(
      `INSERT OR IGNORE INTO participants (room_id, user_id, user_name, joined_at)
       VALUES (?, ?, ?, ?)`
    ).run(roomId, userId, userName, new Date().toISOString());

    const count = await this.getParticipantCount(roomId);
    return { participantCount: count };
  }

  async leaveRoom(
    roomId: string,
    userId: string
  ): Promise<{ participantCount: number }> {
    this.db.prepare(
      `DELETE FROM participants WHERE room_id = ? AND user_id = ?`
    ).run(roomId, userId);

    const count = await this.getParticipantCount(roomId);
    return { participantCount: count };
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    const rows = this.db.prepare(
      `SELECT room_id, user_id, user_name, joined_at
       FROM participants WHERE room_id = ?`
    ).all(roomId) as Array<{
      room_id: string;
      user_id: string;
      user_name: string;
      joined_at: string;
    }>;

    return rows.map((row) => ({
      roomId: row.room_id,
      userId: row.user_id,
      userName: row.user_name,
      joinedAt: new Date(row.joined_at),
    }));
  }

  async getParticipantCount(roomId: string): Promise<number> {
    const row = this.db.prepare(
      `SELECT COUNT(*) AS count FROM participants WHERE room_id = ?`
    ).get(roomId) as { count: number };

    return row.count;
  }
}
