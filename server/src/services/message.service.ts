import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@shared/types';
import type { MessageService as IMessageService } from '@shared/types';

export class MessageService implements IMessageService {
  constructor(private db: Database.Database) {}

  async sendMessage(
    roomId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<Message> {
    if (!content || !content.trim()) {
      throw new Error('Message content is required');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO messages (id, room_id, user_id, user_name, content, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, roomId, userId, userName, content.trim(), now);

    return {
      id,
      roomId,
      userId,
      userName,
      content: content.trim(),
      sentAt: new Date(now),
    };
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    const rows = this.db.prepare(
      `SELECT id, room_id, user_id, user_name, content, sent_at
       FROM messages WHERE room_id = ? ORDER BY sent_at ASC`
    ).all(roomId) as Array<{
      id: string;
      room_id: string;
      user_id: string;
      user_name: string;
      content: string;
      sent_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      userName: row.user_name,
      content: row.content,
      sentAt: new Date(row.sent_at),
    }));
  }
}
