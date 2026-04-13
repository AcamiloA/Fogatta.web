import { Redis } from "@upstash/redis";

import { logWarn } from "@/lib/logger";

type Entry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  limit: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

const inMemoryStore = new Map<string, Entry>();
let redisClientCache: Redis | null | undefined;

function checkRateLimitInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = inMemoryStore.get(key);

  if (!current || current.resetAt <= now) {
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  inMemoryStore.set(key, current);
  return { ok: true, retryAfterSeconds: 0 };
}

function getRedisClient() {
  if (redisClientCache !== undefined) {
    return redisClientCache;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClientCache = null;
    return redisClientCache;
  }

  redisClientCache = new Redis({ url, token });
  return redisClientCache;
}

async function checkRateLimitRedis(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.pexpire(redisKey, options.windowMs);
    }

    if (count <= options.limit) {
      return { ok: true, retryAfterSeconds: 0 };
    }

    const ttlMs = await redis.pttl(redisKey);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 1) / 1000)),
    };
  } catch (error) {
    logWarn("rate_limit_redis_unavailable_fallback_in_memory", {
      reason: error instanceof Error ? error.message : "unknown",
      key,
    });
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const distributedResult = await checkRateLimitRedis(key, options);
  if (distributedResult) {
    return distributedResult;
  }

  return checkRateLimitInMemory(key, options);
}
