/**
 * Export Token Security
 *
 * Generates time-limited, single-use tokens for data export downloads.
 * Prevents direct access to export endpoints without a valid token.
 *
 * Uses in-memory Map (single-dyno compatible for Heroku).
 * Tokens expire after 24 hours and are invalidated after first use.
 */

import { randomBytes } from 'crypto';

interface ExportToken {
  userId: string;
  exportType: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/** In-memory store of export tokens. Key = token string, Value = metadata. */
const tokenStore = new Map<string, ExportToken>();

/** Token expiry: 24 hours */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Cleanup interval: run every hour */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Periodic cleanup of expired tokens
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Array.from(tokenStore.entries()).forEach(([key, token]) => {
      if (now > token.expiresAt || token.used) {
        tokenStore.delete(key);
      }
    });
  }, CLEANUP_INTERVAL_MS);
}

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

  tokenStore.set(token, {
    userId,
    exportType,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    used: false,
  });

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
  const stored = tokenStore.get(token);

  if (!stored) {
    return { valid: false, error: 'Invalid export token' };
  }

  if (stored.used) {
    tokenStore.delete(token);
    return { valid: false, error: 'Export token has already been used' };
  }

  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(token);
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
  tokenStore.set(token, stored);

  return { valid: true };
}

/**
 * Revoke all export tokens for a user (e.g., on logout or account deletion).
 */
export function revokeUserExportTokens(userId: string): number {
  let revoked = 0;
  Array.from(tokenStore.entries()).forEach(([key, token]) => {
    if (token.userId === userId) {
      tokenStore.delete(key);
      revoked++;
    }
  });
  return revoked;
}
