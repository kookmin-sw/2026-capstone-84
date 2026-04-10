import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthPayload, AuthUser, ConvertResponse, RegisterResponse } from '@shared/types';
import type { AuthService as IAuthService, EmailService } from '@shared/types';
import { generateUsername, generatePassword } from './credential-generator';

const JWT_SECRET = process.env.JWT_SECRET || 'chat-rooms-secret';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export class AuthService implements IAuthService {
  constructor(
    private db: Database.Database,
    private emailService?: EmailService
  ) {}

  async register(
    displayName: string,
    email: string
  ): Promise<RegisterResponse> {
    // 기본 이메일 형식 검증
    if (!email || !email.includes('@')) {
      const err = new Error('유효한 이메일 주소를 입력해주세요');
      (err as any).status = 400;
      throw err;
    }

    // 이메일 중복 검사
    const existingEmail = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existingEmail) {
      const err = new Error('이미 사용 중인 이메일입니다');
      (err as any).status = 409;
      throw err;
    }

    // 서버에서 아이디/비밀번호 생성
    const isUnique = (username: string): boolean => {
      const row = this.db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(username);
      return !row;
    };
    const generatedUsername = generateUsername(isUnique);
    const generatedPassword = generatePassword();

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(generatedPassword, SALT_ROUNDS);

    this.db
      .prepare(
        `INSERT INTO users (id, username, password_hash, display_name, email, role)
         VALUES (?, ?, ?, ?, ?, 'user')`
      )
      .run(id, generatedUsername, passwordHash, displayName, email);

    const user: AuthUser = { id, username: generatedUsername, displayName, role: 'user' };
    const token = this.generateToken(user);

    // 이메일 발송 (실패해도 회원가입은 성공 처리)
    if (this.emailService) {
      try {
        await this.emailService.sendCredentials(email, generatedUsername, generatedPassword);
      } catch (e) {
        console.error('자격증명 이메일 발송 실패:', e);
      }
    }

    return { token, user, generatedUsername, generatedPassword };
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

  async reissue(email: string): Promise<void> {
    // 이메일로 사용자 조회
    const row = this.db
      .prepare('SELECT username, display_name FROM users WHERE email = ?')
      .get(email) as { username: string; display_name: string } | undefined;

    if (!row) {
      const err = new Error('일치하는 계정을 찾을 수 없습니다');
      (err as any).status = 404;
      throw err;
    }

    // 새 비밀번호 생성 및 해싱 후 DB 업데이트
    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE email = ?')
      .run(passwordHash, email);

    // 이메일 발송 (실패해도 비밀번호 변경은 유지, 로그만 남김)
    if (this.emailService) {
      try {
        await this.emailService.sendReissuedCredentials(email, row.username, newPassword);
      } catch (e) {
        console.error('재발급 자격증명 이메일 발송 실패:', e);
      }
    }
  }

  async convert(
    guestUserId: string,
    displayName: string,
    email: string
  ): Promise<ConvertResponse> {
    // 이메일 중복 검사
    const existingEmail = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existingEmail) {
      const err = new Error('이미 사용 중인 이메일입니다');
      (err as any).status = 409;
      throw err;
    }

    // 서버에서 아이디/비밀번호 생성
    const isUnique = (username: string): boolean => {
      const row = this.db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(username);
      return !row;
    };
    const generatedUsername = generateUsername(isUnique);
    const generatedPassword = generatePassword();

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(generatedPassword, SALT_ROUNDS);

    // 트랜잭션 내에서 계정 생성 + 게스트 데이터 마이그레이션
    const insertUser = this.db.prepare(
      `INSERT INTO users (id, username, password_hash, display_name, email, role)
       VALUES (?, ?, ?, ?, ?, 'user')`
    );
    const updateMessages = this.db.prepare(
      'UPDATE messages SET user_id = ? WHERE user_id = ?'
    );
    const updateParticipants = this.db.prepare(
      'UPDATE participants SET user_id = ? WHERE user_id = ?'
    );

    const runTransaction = this.db.transaction(() => {
      insertUser.run(id, generatedUsername, passwordHash, displayName, email);
      updateMessages.run(id, guestUserId);
      updateParticipants.run(id, guestUserId);
    });

    runTransaction();

    const user: AuthUser = { id, username: generatedUsername, displayName, role: 'user' };
    const token = this.generateToken(user);

    // 이메일 발송 (실패해도 전환은 성공 처리)
    if (this.emailService) {
      try {
        await this.emailService.sendCredentials(email, generatedUsername, generatedPassword);
      } catch (e) {
        console.error('자격증명 이메일 발송 실패:', e);
      }
    }

    return { token, user, generatedUsername, generatedPassword };
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
