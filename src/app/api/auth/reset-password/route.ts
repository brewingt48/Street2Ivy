/**
 * POST /api/auth/reset-password
 *
 * Reset a user's password using a valid reset token.
 * Token is hashed with SHA-256 and compared against stored hash.
 *
 * Security: rate limiting (10/min), token hashing, password policy enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/auth/validation';
import { updatePassword } from '@/lib/auth/password';
import { deleteUserSessions } from '@/lib/auth/session';
import { sql } from '@/lib/db';
import { createHash } from 'crypto';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const { ip, userAgent } = extractRequestInfo(request);
    const reqInfo = { ip, userAgent, path: '/api/auth/reset-password' };

    // Rate limit by IP
    const rateResult = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    if (!rateResult.allowed) {
      auditLog('RATE_LIMIT_EXCEEDED', { ...reqInfo, details: { endpoint: 'reset-password' } });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Hash the incoming token and compare against stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Find user with matching reset token hash
    const users = await sql`
      SELECT id, email
      FROM users
      WHERE metadata->>'resetTokenHash' = ${tokenHash}
        AND (metadata->>'resetExpires')::timestamptz > NOW()
    `;

    // Also check legacy plaintext tokens for backward compatibility
    // (tokens created before this security update)
    let user;
    if (users.length > 0) {
      user = users[0];
    } else {
      const legacyUsers = await sql`
        SELECT id, email
        FROM users
        WHERE metadata->>'resetToken' = ${token}
          AND (metadata->>'resetExpires')::timestamptz > NOW()
      `;
      if (legacyUsers.length > 0) {
        user = legacyUsers[0];
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update password via PostgreSQL crypt()
    await updatePassword(user.id, password);

    // Clear reset token from metadata (both hash and legacy plaintext)
    await sql`
      UPDATE users
      SET metadata = metadata - 'resetTokenHash' - 'resetToken' - 'resetExpires',
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Invalidate all existing sessions for this user
    await deleteUserSessions(user.id);

    // Audit: password changed via reset
    auditLog('PASSWORD_CHANGED', { ...reqInfo, userId: user.id, email: user.email, details: { method: 'reset-token' } });

    return NextResponse.json({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
