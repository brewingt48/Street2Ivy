/**
 * Account Lockout
 *
 * Tracks failed login attempts per email and locks accounts after
 * too many consecutive failures. In-memory store (single-dyno Heroku).
 *
 * Redis migration: Replace Map with Redis INCR + EXPIRE.
 * Key pattern: `lockout:{email}`, TTL = LOCKOUT_DURATION_MS.
 */

interface LockoutEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const store = new Map<string, LockoutEntry>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour — reset counter after this

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    // Remove entries where lockout expired and attempts window passed
    if (
      (!entry.lockedUntil || entry.lockedUntil < now) &&
      now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS
    ) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}, 300000);

/**
 * Check if an account is currently locked.
 */
export function checkAccountLock(email: string): {
  locked: boolean;
  remainingSeconds?: number;
} {
  const key = email.toLowerCase();
  const entry = store.get(key);

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
  store.delete(key);
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
  let entry = store.get(key);

  if (!entry || now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    // Fresh window
    entry = { attempts: 1, firstAttemptAt: now, lockedUntil: null };
    store.set(key, entry);
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  entry.attempts += 1;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - entry.attempts };
}

/**
 * Clear all failed attempts for an email (call on successful login).
 */
export function clearAttempts(email: string): void {
  store.delete(email.toLowerCase());
}
