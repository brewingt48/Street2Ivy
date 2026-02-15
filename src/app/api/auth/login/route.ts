/**
 * POST /api/auth/login
 *
 * Authenticate a user with email + password.
 * Password verification delegates to PostgreSQL crypt().
 * Creates a session and sets an httpOnly cookie.
 *
 * Security: rate limiting (10/min), account lockout (5 failures → 15 min lock)
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/auth/validation';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { generateSessionId, setSessionCookie } from '@/lib/auth/cookies';
import { getUserByEmail } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import type { SessionData } from '@/lib/auth/types';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { checkAccountLock, recordFailedAttempt, clearAttempts } from '@/lib/security/account-lockout';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const { ip, userAgent } = extractRequestInfo(request);
    const reqInfo = { ip, userAgent, path: '/api/auth/login' };

    // Rate limit by IP
    const rateResult = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    if (!rateResult.allowed) {
      auditLog('RATE_LIMIT_EXCEEDED', { ...reqInfo, details: { endpoint: 'login' } });
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMITS.auth.maxRequests),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check account lockout before attempting password verification
    const lockStatus = checkAccountLock(email);
    if (lockStatus.locked) {
      auditLog('ACCOUNT_LOCKOUT', { ...reqInfo, email, details: { remainingSeconds: lockStatus.remainingSeconds } });
      return NextResponse.json(
        {
          error: `Account temporarily locked due to too many failed attempts. Try again in ${lockStatus.remainingSeconds} seconds.`,
          lockedUntil: lockStatus.remainingSeconds,
        },
        { status: 423 }
      );
    }

    // Verify password via PostgreSQL crypt()
    const userId = await verifyPassword(email, password);

    if (!userId) {
      // Record failed attempt
      const lockResult = recordFailedAttempt(email);
      const eventType = lockResult.locked ? 'ACCOUNT_LOCKOUT' : 'AUTH_FAILURE';
      auditLog(eventType as 'ACCOUNT_LOCKOUT' | 'AUTH_FAILURE', {
        ...reqInfo,
        email,
        details: { attemptsRemaining: lockResult.attemptsRemaining },
      });
      const message = lockResult.locked
        ? 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        : 'Invalid email or password';
      return NextResponse.json(
        { error: message },
        { status: lockResult.locked ? 423 : 401 }
      );
    }

    // Get user details
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Successful login — clear lockout attempts
    clearAttempts(email);

    // Create session
    const sid = generateSessionId();
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: Date.now(),
    };

    await createSession(sid, sessionData);

    // Update last login timestamp
    await sql`
      UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
    `;

    // Set session cookie
    setSessionCookie(sid);

    // Audit: successful login
    auditLog('AUTH_SUCCESS', { ...reqInfo, userId: user.id, email: user.email });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
