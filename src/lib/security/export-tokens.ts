/**
 * Export Token Security
 *
 * Generates time-limited, single-use tokens for data export downloads.
 * Prevents direct access to export endpoints without a valid token.
 *
 * Uses Redis (SET with EX) when available for cross-dyno persistence,
 * with in-memory Map as the always-present fallback. Public API is
 * synchronous — Redis operations run in the background so callers
 * do not need to await.
 *
 * Redis key patterns:
 *   export-token:{token}         — token metadata JSON (TTL = 24h)
 *   export-tokens-user:{userId}  — set of active tokens for a user
 */

import { randomBytes } from 'crypto';
import { getRedis, isRedisAvailable } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportToken {
  userId: string;
  exportType: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Token expiry: 24 hours */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_TTL_SEC = Math.ceil(TOKEN_TTL_MS / 1000);

/** Cleanup interval: run every hour */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// In-memory store (always active — primary for sync responses)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, ExportToken>();

// Periodic cleanup of expired tokens
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Array.from(memoryStore.entries()).forEach(([key, token]) => {
      if (now > token.expiresAt || token.used) {
        memoryStore.delete(key);
      }
    });
  }, CLEANUP_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Redis background sync helpers
// ---------------------------------------------------------------------------

/**
 * Store a token in Redis (fire-and-forget).
 */
function pushTokenToRedis(
  token: string,
  userId: string,
  exportType: string,
  createdAt: number
): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    const redisKey = `export-token:${token}`;
    const value = JSON.stringify({ userId, exportType, createdAt });

    redis.set(redisKey, value, 'EX', TOKEN_TTL_SEC).catch(() => {});

    // Track per-user for revocation
    const userSetKey = `export-tokens-user:${userId}`;
    redis.sadd(userSetKey, token).catch(() => {});
    redis.expire(userSetKey, TOKEN_TTL_SEC).catch(() => {});
  } catch {
    // Swallow
  }
}

/**
 * Mark a token as consumed in Redis (fire-and-forget deletion).
 */
function consumeTokenInRedis(token: string, userId: string): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    redis.del(`export-token:${token}`).catch(() => {});
    redis.srem(`export-tokens-user:${userId}`, token).catch(() => {});
  } catch {
    // Swallow
  }
}

/**
 * Revoke all tokens for a user in Redis (fire-and-forget).
 */
function revokeUserTokensInRedis(userId: string): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    const userSetKey = `export-tokens-user:${userId}`;

    redis
      .smembers(userSetKey)
      .then((tokens) => {
        if (tokens.length === 0) return;
        const pipeline = redis.pipeline();
        tokens.forEach((t) => {
          pipeline.del(`export-token:${t}`);
        });
        pipeline.del(userSetKey);
        return pipeline.exec();
      })
      .catch(() => {});
  } catch {
    // Swallow
  }
}

// ---------------------------------------------------------------------------
// Public API (synchronous — matches original signatures)
// ---------------------------------------------------------------------------

/**
 * Generate a single-use export token.
 *
 * @param userId - The user requesting the export
 * @param exportType - Type of export (e.g., 'profile', 'transactions', 'audit-log')
 * @returns The generated token string (32 bytes, hex-encoded = 64 chars)
 */
export function generateExportToken(userId: string, exportType: string): string {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();

  memoryStore.set(token, {
    userId,
    exportType,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    used: false,
  });

  // Mirror to Redis for cross-dyno visibility
  pushTokenToRedis(token, userId, exportType, now);

  return token;
}

/**
 * Validate and consume an export token.
 * Returns the token metadata if valid, or null if invalid/expired/already used.
 *
 * IMPORTANT: This function consumes the token — it can only be validated once.
 */
export function validateExportToken(
  token: string,
  expectedUserId: string,
  expectedExportType?: string
): { valid: boolean; error?: string } {
  const stored = memoryStore.get(token);

  if (!stored) {
    return { valid: false, error: 'Invalid export token' };
  }

  if (stored.used) {
    memoryStore.delete(token);
    return { valid: false, error: 'Export token has already been used' };
  }

  if (Date.now() > stored.expiresAt) {
    memoryStore.delete(token);
    return { valid: false, error: 'Export token has expired' };
  }

  if (stored.userId !== expectedUserId) {
    return { valid: false, error: 'Export token does not belong to this user' };
  }

  if (expectedExportType && stored.exportType !== expectedExportType) {
    return { valid: false, error: 'Export token type mismatch' };
  }

  // Mark as used (single-use)
  stored.used = true;
  memoryStore.set(token, stored);

  // Remove from Redis so other dynos cannot replay it
  consumeTokenInRedis(token, expectedUserId);

  return { valid: true };
}

/**
 * Revoke all export tokens for a user (e.g., on logout or account deletion).
 */
export function revokeUserExportTokens(userId: string): number {
  let revoked = 0;
  Array.from(memoryStore.entries()).forEach(([key, token]) => {
    if (token.userId === userId) {
      memoryStore.delete(key);
      revoked++;
    }
  });

  // Also revoke in Redis
  revokeUserTokensInRedis(userId);

  return revoked;
}
