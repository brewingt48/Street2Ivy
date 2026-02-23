/**
 * Redis Client Singleton
 *
 * Provides a shared Redis connection for rate limiting, account lockout,
 * and export token storage. Reads REDIS_URL or REDIS_TLS_URL from env
 * (Heroku format) and falls back to localhost for local development.
 *
 * The app continues to work without Redis — all consumers fall back to
 * in-memory stores when Redis is unavailable.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let redisAvailable = false;

function getRedisUrl(): string {
  // Heroku sets REDIS_TLS_URL for Premium/Private plans (rediss://)
  // and REDIS_URL for Hobby/Mini plans (redis://)
  return (
    process.env.REDIS_TLS_URL ||
    process.env.REDIS_URL ||
    'redis://localhost:6379'
  );
}

function createRedisClient(): Redis {
  const url = getRedisUrl();
  const isTls = url.startsWith('rediss://');

  const client = new Redis(url, {
    // Heroku Redis requires TLS with self-signed certs
    ...(isTls && {
      tls: { rejectUnauthorized: false },
    }),
    // Reconnect with exponential backoff, max 10s
    retryStrategy(times: number) {
      if (times > 20) {
        // Stop retrying after ~20 attempts — rely on in-memory fallback
        return null;
      }
      return Math.min(times * 200, 10000);
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect', () => {
    redisAvailable = true;
  });

  client.on('ready', () => {
    redisAvailable = true;
    console.log('[redis] Connected and ready');
  });

  client.on('error', (err: Error) => {
    redisAvailable = false;
    // Log but do not crash — consumers fall back to in-memory
    console.warn('[redis] Connection error:', err.message);
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  client.on('end', () => {
    redisAvailable = false;
  });

  return client;
}

/**
 * Get the singleton Redis client instance.
 * Lazily creates the connection on first call.
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = createRedisClient();
    // Attempt connection without blocking — errors are handled by the
    // event listeners above.
    redis.connect().catch(() => {
      // Swallow — the 'error' event handler already logged it
    });
  }
  return redis;
}

/**
 * Returns true if Redis is currently connected and responsive.
 * Consumers should check this before attempting Redis operations
 * and fall back to in-memory stores when false.
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}
