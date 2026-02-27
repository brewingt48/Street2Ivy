/**
 * CSRF Protection
 *
 * Double-submit cookie pattern for CSRF protection.
 * - On GET requests, set a CSRF token cookie
 * - On mutation requests, validate the X-CSRF-Token header matches the cookie
 */

import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Generate a CSRF token and set it as a cookie.
 */
export function generateCsrfToken(): string {
  const token = randomBytes(32).toString('hex');
  const cookieStore = cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });
  return token;
}

/**
 * Validate CSRF token from request header against cookie.
 * Returns null if valid, NextResponse if invalid.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null; // Valid
}

/**
 * Get the current CSRF token from cookies (for client-side use).
 */
export function getCsrfToken(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(CSRF_COOKIE)?.value;
}
