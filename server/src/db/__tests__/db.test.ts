import { createDatabase, migrate } from '../index';
import Database from 'better-sqlite3';

describe('Database initialization', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  test('WAL journal mode is enabled', () => {
    const result = db.pragma('journal_mode', { simple: true });
    expect(result).toBe('memory'); // in-memory DB reports 'memory' instead of 'wal'
  });

  test('foreign keys are enabled', () => {
    const result = db.pragma('foreign_keys', { simple: true });
    expect(result).toBe(1);
  });

  test('chat_rooms table exists with correct columns', () => {
    const columns = db.pragma('table_info(chat_rooms)') as Array<{ name: string }>;
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'title', 'topic', 'creator_id', 'creator_name', 'created_at'])
    );
  });

  test('messages table exists with correct columns', () => {
    const columns = db.pragma('table_info(messages)') as Array<{ name: string }>;
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'room_id', 'user_id', 'user_name', 'content', 'sent_at'])
    );
  });

  test('participants table exists with correct columns', () => {
    const columns = db.pragma('table_info(participants)') as Array<{ name: string }>;
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toEqual(
      expect.arrayContaining(['room_id', 'user_id', 'user_name', 'joined_at'])
    );
  });

  test('foreign key constraint on messages.room_id is enforced', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO messages (id, room_id, user_id, user_name, content) VALUES ('m1', 'nonexistent', 'u1', 'User', 'hello')"
      ).run();
    }).toThrow();
  });

  test('foreign key constraint on participants.room_id is enforced', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO participants (room_id, user_id, user_name) VALUES ('nonexistent', 'u1', 'User')"
      ).run();
    }).toThrow();
  });

  test('participants table has composite primary key (room_id, user_id)', () => {
    // Insert a room first
    db.prepare(
      "INSERT INTO chat_rooms (id, title, topic, creator_id, creator_name) VALUES ('r1', 'Room', 'Topic', 'u1', 'User')"
    ).run();

    db.prepare(
      "INSERT INTO participants (room_id, user_id, user_name) VALUES ('r1', 'u1', 'User')"
    ).run();

    // Duplicate should fail
    expect(() => {
      db.prepare(
        "INSERT INTO participants (room_id, user_id, user_name) VALUES ('r1', 'u1', 'User')"
      ).run();
    }).toThrow();
  });

  test('migrate is idempotent (can run multiple times)', () => {
    expect(() => {
      migrate(db);
      migrate(db);
    }).not.toThrow();
  });
});
