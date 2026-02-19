/**
 * Rate Limiting
 *
 * In-memory sliding window rate limiter for API endpoints.
 * Single-process friendly (Heroku single-dyno).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600000);
    if (entry.timestamps.length === 0) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}, 300000);

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a request from a given key is within rate limits.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 30 }
): RateLimitResult {
  const now = Date.now();
  const { windowMs, maxRequests } = options;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
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
