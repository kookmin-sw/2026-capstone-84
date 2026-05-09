import { Router, Request, Response } from 'express';
import { readerPrisma } from '../lib/prisma';
import { redisService } from '../services/redis.service';
import { searchService } from '../services/search.service';

const router = Router();

interface HealthCheckResult {
  status: 'up' | 'down' | 'disabled';
  latency?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded';
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    opensearch: HealthCheckResult;
  };
  timestamp: string;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await readerPrisma.$queryRaw`SELECT 1`;
    return { status: 'up', latency: Date.now() - start };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  if (!redisService.isEnabled()) {
    return { status: 'disabled' };
  }
  const start = Date.now();
  try {
    const pong = await redisService.ping();
    return { status: pong ? 'up' : 'down', latency: Date.now() - start };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

async function checkOpenSearch(): Promise<HealthCheckResult> {
  if (!searchService.isEnabled()) {
    return { status: 'disabled' };
  }
  return { status: 'up' };
}

router.get('/health', async (_req: Request, res: Response) => {
  const [database, redis, opensearch] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkOpenSearch(),
  ]);

  const checks = { database, redis, opensearch };

  const hasDown = Object.values(checks).some((c) => c.status === 'down');
  const status: HealthResponse['status'] = hasDown ? 'degraded' : 'healthy';
  const httpStatus = hasDown ? 503 : 200;

  const response: HealthResponse = {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };

  res.status(httpStatus).json(response);
});

export default router;
