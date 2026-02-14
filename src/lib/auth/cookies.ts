/**
 * Cookie Management
 *
 * httpOnly cookie management for session tokens.
 * Cookie name: s2i.sid (matching the middleware expectation)
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const COOKIE_NAME = 's2i.sid';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Generate a cryptographically random session ID.
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Set the session cookie.
 */
export function setSessionCookie(sessionId: string): void {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Get the session ID from the cookie.
 */
export function getSessionCookie(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Delete the session cookie (logout).
 */
export function deleteSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME, SESSION_MAX_AGE };
