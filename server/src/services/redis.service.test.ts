import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared mock instance that all tests and the service will use
const mockClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  scan: vi.fn().mockResolvedValue(['0', []]),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
};

vi.mock('ioredis', () => {
  return { default: vi.fn().mockImplementation(() => mockClient) };
});

describe('RedisService', () => {
  describe('Redis 비활성화 (환경 변수 미설정)', () => {
    beforeEach(() => {
      vi.resetModules();
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_TLS;
      delete process.env.REDIS_PASSWORD;
    });

    it('REDIS_HOST 미설정 시 비활성화 상태여야 한다', async () => {
      const { redisService } = await import('./redis.service');
      expect(redisService.isEnabled()).toBe(false);
    });

    it('비활성화 상태에서 setSession은 에러 없이 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await expect(
        redisService.setSession('test-session', {
          userId: 'user1',
          email: 'test@test.com',
          refreshToken: 'token',
          createdAt: Date.now(),
        })
      ).resolves.toBeUndefined();
    });

    it('비활성화 상태에서 getSession은 null을 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const result = await redisService.getSession('test-session');
      expect(result).toBeNull();
    });

    it('비활성화 상태에서 deleteSession은 에러 없이 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await expect(redisService.deleteSession('test-session')).resolves.toBeUndefined();
    });

    it('비활성화 상태에서 setCache는 에러 없이 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await expect(
        redisService.setCache('discussions', 'popular:1', { data: [] })
      ).resolves.toBeUndefined();
    });

    it('비활성화 상태에서 getCache는 null을 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const result = await redisService.getCache('discussions', 'popular:1');
      expect(result).toBeNull();
    });

    it('비활성화 상태에서 invalidateCache는 에러 없이 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await expect(redisService.invalidateCache('discussions:*')).resolves.toBeUndefined();
    });

    it('비활성화 상태에서 ping은 false를 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const result = await redisService.ping();
      expect(result).toBe(false);
    });
  });

  describe('Redis 활성화 (환경 변수 설정)', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      mockClient.get.mockResolvedValue(null);
      mockClient.scan.mockResolvedValue(['0', []]);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_TLS = 'false';
    });

    it('REDIS_HOST 설정 시 활성화 상태여야 한다', async () => {
      const { redisService } = await import('./redis.service');
      expect(redisService.isEnabled()).toBe(true);
    });

    it('ping은 true를 반환해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const result = await redisService.ping();
      expect(result).toBe(true);
    });

    it('setSession은 세션 데이터를 TTL 24시간으로 저장해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        refreshToken: 'refresh-token-abc',
        createdAt: Date.now(),
      };

      await redisService.setSession('session-id-1', sessionData);

      expect(mockClient.set).toHaveBeenCalledWith(
        'session:session-id-1',
        JSON.stringify(sessionData),
        'EX',
        86400 // 24시간
      );
    });

    it('getSession은 저장된 세션 데이터를 반환해야 한다', async () => {
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        refreshToken: 'refresh-token-abc',
        createdAt: 1700000000000,
      };
      mockClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const { redisService } = await import('./redis.service');
      const result = await redisService.getSession('session-id-1');

      expect(result).toEqual(sessionData);
      expect(mockClient.get).toHaveBeenCalledWith('session:session-id-1');
    });

    it('getSession은 데이터가 없으면 null을 반환해야 한다', async () => {
      mockClient.get.mockResolvedValue(null);

      const { redisService } = await import('./redis.service');
      const result = await redisService.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('deleteSession은 세션을 삭제해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await redisService.deleteSession('session-id-1');

      expect(mockClient.del).toHaveBeenCalledWith('session:session-id-1');
    });

    it('setCache는 캐시 데이터를 지정된 TTL로 저장해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      const cacheData = { items: [{ id: '1', title: '테스트 게시글' }] };

      await redisService.setCache('discussions', 'popular:1', cacheData, 600);

      expect(mockClient.set).toHaveBeenCalledWith(
        'cache:discussions:popular:1',
        JSON.stringify(cacheData),
        'EX',
        600
      );
    });

    it('setCache는 TTL 미지정 시 기본 300초를 사용해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await redisService.setCache('group', 'g1', { name: '독서모임' });

      expect(mockClient.set).toHaveBeenCalledWith(
        'cache:group:g1',
        JSON.stringify({ name: '독서모임' }),
        'EX',
        300
      );
    });

    it('getCache는 저장된 캐시 데이터를 반환해야 한다', async () => {
      const cacheData = { items: [{ id: '1', title: '테스트 게시글' }] };
      mockClient.get.mockResolvedValue(JSON.stringify(cacheData));

      const { redisService } = await import('./redis.service');
      const result = await redisService.getCache('discussions', 'popular:1');

      expect(result).toEqual(cacheData);
      expect(mockClient.get).toHaveBeenCalledWith('cache:discussions:popular:1');
    });

    it('getCache는 데이터가 없으면 null을 반환해야 한다', async () => {
      mockClient.get.mockResolvedValue(null);

      const { redisService } = await import('./redis.service');
      const result = await redisService.getCache('discussions', 'popular:1');

      expect(result).toBeNull();
    });

    it('invalidateCache는 패턴에 매칭되는 키를 삭제해야 한다', async () => {
      mockClient.scan.mockResolvedValue([
        '0',
        ['bookclub:cache:discussions:popular:1', 'bookclub:cache:discussions:popular:2'],
      ]);

      const { redisService } = await import('./redis.service');
      await redisService.invalidateCache('discussions:*');

      expect(mockClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'bookclub:cache:discussions:*',
        'COUNT',
        100
      );
      expect(mockClient.del).toHaveBeenCalledWith(
        'cache:discussions:popular:1',
        'cache:discussions:popular:2'
      );
    });

    it('invalidateCache는 매칭 키가 없으면 del을 호출하지 않아야 한다', async () => {
      mockClient.scan.mockResolvedValue(['0', []]);

      const { redisService } = await import('./redis.service');
      await redisService.invalidateCache('nonexistent:*');

      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('TLS 옵션이 true일 때 TLS가 활성화되어야 한다', async () => {
      vi.resetModules();
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_TLS = 'true';

      const Redis = (await import('ioredis')).default;
      await import('./redis.service');

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          tls: { rejectUnauthorized: true },
        })
      );
    });

    it('disconnect는 연결을 종료해야 한다', async () => {
      const { redisService } = await import('./redis.service');
      await redisService.disconnect();

      expect(mockClient.quit).toHaveBeenCalled();
      expect(redisService.isEnabled()).toBe(false);
    });
  });
});
