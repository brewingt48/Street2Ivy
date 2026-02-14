/**
 * POST /api/auth/login
 *
 * Authenticate a user with email + password.
 * Password verification delegates to PostgreSQL crypt().
 * Creates a session and sets an httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/auth/validation';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { generateSessionId, setSessionCookie } from '@/lib/auth/cookies';
import { getUserByEmail } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import type { SessionData } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Verify password via PostgreSQL crypt()
    const userId = await verifyPassword(email, password);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
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
