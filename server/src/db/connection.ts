import Database from 'better-sqlite3';
import path from 'path';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'chat.db');

export function createDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  const db = new Database(dbPath);

  // WAL 모드 설정 (동시 읽기 성능 향상)
  db.pragma('journal_mode = WAL');

  // 외래키 제약 활성화
  db.pragma('foreign_keys = ON');

  return db;
}
