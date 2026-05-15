import Database from 'better-sqlite3';
import { createDatabase, migrate } from '../../db';
import { RoomService } from '../room.service';

describe('RoomService.deleteRoom', () => {
  let db: Database.Database;
  let roomService: RoomService;

  beforeEach(() => {
    db = createDatabase(':memory:');
    migrate(db);
    roomService = new RoomService(db);
  });

  afterEach(() => {
    db.close();
  });

  test('deletes room and all related participants and messages', async () => {
    const room = await roomService.createRoom('Test Room', 'Topic', 'u1', 'User1');

    // Add a message
    db.prepare(
      "INSERT INTO messages (id, room_id, user_id, user_name, content) VALUES ('m1', ?, 'u1', 'User1', 'hello')"
    ).run(room.id);

    // Add another participant
    db.prepare(
      "INSERT INTO participants (room_id, user_id, user_name) VALUES (?, 'u2', 'User2')"
    ).run(room.id);

    await roomService.deleteRoom(room.id);

    // Room should be gone
    const deletedRoom = await roomService.getRoomById(room.id);
    expect(deletedRoom).toBeNull();

    // Messages should be gone
    const messages = db.prepare('SELECT * FROM messages WHERE room_id = ?').all(room.id);
    expect(messages).toHaveLength(0);

    // Participants should be gone
    const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(room.id);
    expect(participants).toHaveLength(0);
  });

  test('does not affect other rooms when deleting one', async () => {
    const room1 = await roomService.createRoom('Room 1', 'Topic 1', 'u1', 'User1');
    const room2 = await roomService.createRoom('Room 2', 'Topic 2', 'u2', 'User2');

    await roomService.deleteRoom(room1.id);

    const remaining = await roomService.getRoomById(room2.id);
    expect(remaining).not.toBeNull();
    expect(remaining!.title).toBe('Room 2');
  });

  test('succeeds silently when deleting a non-existent room', async () => {
    await expect(roomService.deleteRoom('non-existent-id')).resolves.toBeUndefined();
  });
});
