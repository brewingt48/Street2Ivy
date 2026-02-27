/**
 * Rate Limiting
 *
 * Sliding-window rate limiter for API endpoints.
 * Uses Redis (INCR + EXPIRE) when available for cross-dyno consistency,
 * with in-memory Map as the always-present fallback.
 *
 * The public API is synchronous — Redis operations run in the background
 * so callers do not need to await.
 */

import { getRedis, isRedisAvailable } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

// ---------------------------------------------------------------------------
// In-memory store (always active — primary for sync responses)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  memoryStore.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600000);
    if (entry.timestamps.length === 0) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => memoryStore.delete(key));
}, 300000);

// ---------------------------------------------------------------------------
// Redis background sync
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget: increment the Redis counter for cross-dyno tracking.
 * Uses fixed-window buckets: key = rl:{identifier}:{windowBucket}
 */
function syncToRedis(key: string, options: RateLimitOptions): void {
  if (!isRedisAvailable()) return;

  const { windowMs } = options;
  const window = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${window}`;
  const ttlSeconds = Math.ceil(windowMs / 1000);

  try {
    const redis = getRedis();
    redis
      .incr(redisKey)
      .then((count) => {
        if (count === 1) {
          return redis.expire(redisKey, ttlSeconds);
        }
      })
      .catch(() => {
        // Swallow — Redis sync is best-effort
      });
  } catch {
    // Swallow — Redis may not be initialised yet
  }
}

/**
 * Try to read the current count from Redis for the active window.
 * If Redis has a higher count than local memory (e.g. other dynos contributed),
 * we inject synthetic timestamps into the in-memory store so the local dyno
 * respects the aggregate count.
 */
function pullFromRedis(
  key: string,
  options: RateLimitOptions,
  localCount: number
): void {
  if (!isRedisAvailable()) return;

  const { windowMs } = options;
  const window = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${window}`;

  try {
    const redis = getRedis();
    redis
      .get(redisKey)
      .then((val) => {
        if (!val) return;
        const redisCount = parseInt(val, 10);
        if (isNaN(redisCount) || redisCount <= localCount) return;

        // Inject synthetic timestamps so the next sync check uses the higher count
        let entry = memoryStore.get(key);
        if (!entry) {
          entry = { timestamps: [] };
          memoryStore.set(key, entry);
        }
        const now = Date.now();
        while (entry.timestamps.length < redisCount) {
          entry.timestamps.push(now);
        }
      })
      .catch(() => {
        // Swallow
      });
  } catch {
    // Swallow
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a request from a given key is within rate limits.
 * Always returns synchronously using the in-memory store.
 * Redis is updated in the background for cross-dyno consistency.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 30 }
): RateLimitResult {
  const now = Date.now();
  const { windowMs, maxRequests } = options;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;

    // Still sync to Redis so the block is visible to other dynos
    syncToRedis(key, options);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  entry.timestamps.push(now);

  const result: RateLimitResult = {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };

  // Background: push to Redis and pull any higher counts from other dynos
  syncToRedis(key, options);
  pullFromRedis(key, options, entry.timestamps.length);

  return result;
}

/**
 * Common rate limit presets
 */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute */
  auth: { windowMs: 60000, maxRequests: 10 },
  /** API reads: 60 requests per minute */
  read: { windowMs: 60000, maxRequests: 60 },
  /** API writes: 30 requests per minute */
  write: { windowMs: 60000, maxRequests: 30 },
  /** Email sends: 5 per minute */
  email: { windowMs: 60000, maxRequests: 5 },
  /** File uploads: 10 per minute */
  upload: { windowMs: 60000, maxRequests: 10 },
} as const;
