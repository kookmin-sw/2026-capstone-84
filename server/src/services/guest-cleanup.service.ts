import Database from 'better-sqlite3';
import type { GuestCleanupService as IGuestCleanupService } from '@shared/types';

export class GuestCleanupService implements IGuestCleanupService {
  constructor(private db: Database.Database) {}

  cleanupInactiveGuests(): void {
    this.db.prepare(
      `DELETE FROM participants
       WHERE user_id NOT IN (SELECT id FROM users)
         AND joined_at < datetime('now', '-30 days')`
    ).run();
  }
}
