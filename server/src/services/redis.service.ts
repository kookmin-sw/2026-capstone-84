import Redis from 'ioredis';

// ============================================================
// Redis 서비스 모듈
// - 세션 관리 (TTL 24시간)
// - 캐시 관리 (패턴 기반 무효화)
// - 헬스체크
// - 환경 변수 미설정 시 비활성화 (로컬 개발 지원)
// ============================================================

const SESSION_TTL = 86400; // 24시간 (초)
const KEY_PREFIX = 'bookclub:';

export interface SessionData {
  userId: string;
  email: string;
  refreshToken: string;
  createdAt: number;
}

interface RedisServiceInterface {
  isEnabled(): boolean;
  setSession(sessionId: string, data: SessionData): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  deleteSession(sessionId: string): Promise<void>;
  setCache(entity: string, id: string, data: unknown, ttlSeconds?: number): Promise<void>;
  getCache<T>(entity: string, id: string): Promise<T | null>;
  invalidateCache(pattern: string): Promise<void>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

class RedisService implements RedisServiceInterface {
  private client: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisTls = process.env.REDIS_TLS === 'true';
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisHost) {
      console.log('[Redis] REDIS_HOST 미설정 - Redis 비활성화 (로컬 개발 모드)');
      this.enabled = false;
      return;
    }

    try {
      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        tls: redisTls ? { rejectUnauthorized: true } : undefined,
        keyPrefix: KEY_PREFIX,
        retryStrategy(times: number): number | null {
          if (times > 10) {
            console.error('[Redis] 최대 재연결 시도 횟수 초과');
            return null;
          }
          // 지수 백오프: 최소 100ms, 최대 30초
          const delay = Math.min(times * 100, 30000);
          console.log(`[Redis] 재연결 시도 ${times}회 - ${delay}ms 후 재시도`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        console.log('[Redis] 연결 성공');
        this.enabled = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('[Redis] 연결 오류:', err.message);
      });

      this.client.on('close', () => {
        console.log('[Redis] 연결 종료');
      });

      // 초기 연결 시도
      this.client.connect().then(() => {
        this.enabled = true;
      }).catch((err: Error) => {
        console.error('[Redis] 초기 연결 실패:', err.message);
        this.enabled = false;
      });

      this.enabled = true;
    } catch (err) {
      console.error('[Redis] 클라이언트 초기화 실패:', err);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  // ============================================================
  // 세션 관리
  // 키 형식: bookclub:session:{sessionId}
  // ============================================================

  async setSession(sessionId: string, data: SessionData): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const key = `session:${sessionId}`;
    await this.client.set(key, JSON.stringify(data), 'EX', SESSION_TTL);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.isEnabled() || !this.client) return null;

    const key = `session:${sessionId}`;
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as SessionData;
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  // ============================================================
  // 캐시 관리
  // 키 형식: bookclub:cache:{entity}:{id}
  // ============================================================

  async setCache(entity: string, id: string, data: unknown, ttlSeconds: number = 300): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const key = `cache:${entity}:${id}`;
    await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getCache<T>(entity: string, id: string): Promise<T | null> {
    if (!this.isEnabled() || !this.client) return null;

    const key = `cache:${entity}:${id}`;
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    // SCAN을 사용하여 패턴에 매칭되는 키를 찾아 삭제
    // keyPrefix가 자동으로 붙으므로, 실제 Redis에서는 bookclub:cache:{pattern} 형태로 검색
    const fullPattern = `cache:${pattern}`;
    let cursor = '0';

    do {
      // scanStream 대신 scan 명령 직접 사용 (keyPrefix 고려)
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${KEY_PREFIX}${fullPattern}`,
        'COUNT',
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        // keyPrefix가 자동으로 붙으므로 제거 후 del 호출
        const keysWithoutPrefix = keys.map((key) => key.replace(KEY_PREFIX, ''));
        await this.client.del(...keysWithoutPrefix);
      }
    } while (cursor !== '0');
  }

  // ============================================================
  // 헬스체크
  // ============================================================

  async ping(): Promise<boolean> {
    if (!this.isEnabled() || !this.client) return false;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // ============================================================
  // 연결 종료
  // ============================================================

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.enabled = false;
    }
  }
}

// 싱글톤 인스턴스 export
export const redisService = new RedisService();
