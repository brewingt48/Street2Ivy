/**
 * Account Lockout
 *
 * Tracks failed login attempts per email and locks accounts after
 * too many consecutive failures.
 *
 * Uses Redis for cross-dyno persistence when available, with in-memory
 * Map as the always-present fallback. Public API is synchronous — Redis
 * operations run in the background so callers do not need to await.
 *
 * Redis key patterns:
 *   lockout:{email}         — attempt counter (TTL = ATTEMPT_WINDOW_SEC)
 *   lockout:locked:{email}  — lockout flag   (TTL = LOCKOUT_DURATION_SEC)
 */

import { getRedis, isRedisAvailable } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;   // 1 hour — reset counter after this

const LOCKOUT_DURATION_SEC = Math.ceil(LOCKOUT_DURATION_MS / 1000);
const ATTEMPT_WINDOW_SEC = Math.ceil(ATTEMPT_WINDOW_MS / 1000);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LockoutEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

// ---------------------------------------------------------------------------
// In-memory store (always active — primary for sync responses)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, LockoutEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  memoryStore.forEach((entry, key) => {
    if (
      (!entry.lockedUntil || entry.lockedUntil < now) &&
      now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS
    ) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => memoryStore.delete(key));
}, 300000);

// ---------------------------------------------------------------------------
// Redis background sync helpers
// ---------------------------------------------------------------------------

/**
 * Pull lockout state from Redis into the in-memory store.
 * If Redis shows the account is locked (from another dyno), we update
 * the local in-memory store so the next synchronous check sees it.
 */
function pullLockoutFromRedis(identifier: string): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    const lockedKey = `lockout:locked:${identifier}`;

    redis
      .ttl(lockedKey)
      .then((ttl) => {
        if (ttl > 0) {
          // Another dyno locked this account — mirror into memory
          const existing = memoryStore.get(identifier);
          const lockedUntil = Date.now() + ttl * 1000;
          if (!existing || !existing.lockedUntil || existing.lockedUntil < lockedUntil) {
            memoryStore.set(identifier, {
              attempts: MAX_ATTEMPTS,
              firstAttemptAt: Date.now() - ATTEMPT_WINDOW_MS + 1,
              lockedUntil,
            });
          }
        }
      })
      .catch(() => {
        // Swallow — in-memory is authoritative when Redis fails
      });
  } catch {
    // Swallow
  }
}

/**
 * Push a failed attempt to Redis (fire-and-forget).
 */
function pushAttemptToRedis(identifier: string): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    const attemptsKey = `lockout:${identifier}`;

    redis
      .incr(attemptsKey)
      .then((count) => {
        if (count === 1) {
          return redis.expire(attemptsKey, ATTEMPT_WINDOW_SEC);
        }

        if (count >= MAX_ATTEMPTS) {
          const lockedKey = `lockout:locked:${identifier}`;
          redis
            .set(lockedKey, '1', 'EX', LOCKOUT_DURATION_SEC)
            .then(() => redis.del(attemptsKey))
            .catch(() => {});
        }
      })
      .catch(() => {
        // Swallow
      });
  } catch {
    // Swallow
  }
}

/**
 * Clear attempts in Redis (fire-and-forget).
 */
function clearAttemptsInRedis(identifier: string): void {
  if (!isRedisAvailable()) return;

  try {
    const redis = getRedis();
    redis.del(`lockout:${identifier}`, `lockout:locked:${identifier}`).catch(() => {});
  } catch {
    // Swallow
  }
}

// ---------------------------------------------------------------------------
// Public API (synchronous — matches original signatures)
// ---------------------------------------------------------------------------

/**
 * Check if an account is currently locked.
 */
export function checkAccountLock(email: string): {
  locked: boolean;
  remainingSeconds?: number;
} {
  const key = email.toLowerCase();
  const entry = memoryStore.get(key);

  // Kick off async Redis pull so the NEXT check will reflect cross-dyno state
  pullLockoutFromRedis(key);

  if (!entry || !entry.lockedUntil) {
    return { locked: false };
  }

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return {
      locked: true,
      remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Lockout expired — clear it
  memoryStore.delete(key);
  return { locked: false };
}

/**
 * Record a failed login attempt. Returns whether the account is now locked.
 */
export function recordFailedAttempt(email: string): {
  locked: boolean;
  attemptsRemaining: number;
} {
  const key = email.toLowerCase();
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    // Fresh window
    entry = { attempts: 1, firstAttemptAt: now, lockedUntil: null };
    memoryStore.set(key, entry);
    pushAttemptToRedis(key);
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  entry.attempts += 1;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    pushAttemptToRedis(key);
    return { locked: true, attemptsRemaining: 0 };
  }

  pushAttemptToRedis(key);
  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - entry.attempts };
}

/**
 * Clear all failed attempts for an email (call on successful login).
 */
export function clearAttempts(email: string): void {
  const key = email.toLowerCase();
  memoryStore.delete(key);
  clearAttemptsInRedis(key);
}
