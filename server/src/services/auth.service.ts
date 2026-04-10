import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthPayload, AuthUser } from '@shared/types';
import type { AuthService as IAuthService } from '@shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'chat-rooms-secret';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export class AuthService implements IAuthService {
  constructor(private db: Database.Database) {}

  async register(
    username: string,
    password: string,
    displayName: string
  ): Promise<{ token: string; user: AuthUser }> {
    // 중복 아이디 검사
    const existing = this.db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);
    if (existing) {
      const err = new Error('이미 사용 중인 아이디입니다');
      (err as any).status = 409;
      throw err;
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    this.db
      .prepare(
        `INSERT INTO users (id, username, password_hash, display_name, role)
         VALUES (?, ?, ?, ?, 'user')`
      )
      .run(id, username, passwordHash, displayName);

    const user: AuthUser = { id, username, displayName, role: 'user' };
    const token = this.generateToken(user);

    return { token, user };
  }

  async login(
    username: string,
    password: string
  ): Promise<{ token: string; user: AuthUser }> {
    const row = this.db
      .prepare(
        'SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?'
      )
      .get(username) as
      | {
          id: string;
          username: string;
          password_hash: string;
          display_name: string;
          role: 'user' | 'admin';
        }
      | undefined;

    if (!row) {
      const err = new Error('아이디 또는 비밀번호가 올바르지 않습니다');
      (err as any).status = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      const err = new Error('아이디 또는 비밀번호가 올바르지 않습니다');
      (err as any).status = 401;
      throw err;
    }

    const user: AuthUser = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    };
    const token = this.generateToken(user);

    return { token, user };
  }

  verifyToken(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      return decoded;
    } catch {
      const err = new Error('유효하지 않은 토큰입니다');
      (err as any).status = 401;
      throw err;
    }
  }

  ensureAdminExists(): void {
    const existing = this.db
      .prepare("SELECT id FROM users WHERE username = 'admin'")
      .get();

    if (existing) return;

    const id = uuidv4();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
    const passwordHash = bcrypt.hashSync(adminPassword, SALT_ROUNDS);

    this.db
      .prepare(
        `INSERT INTO users (id, username, password_hash, display_name, role)
         VALUES (?, 'admin', ?, '관리자', 'admin')`
      )
      .run(id, passwordHash);
  }

  private generateToken(user: AuthUser): string {
    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}
