/**
 * POST /api/auth/forgot-password
 *
 * Generate a password reset token and send a reset email.
 * Stores a SHA-256 hash of the token in the user's metadata JSONB field.
 * The plaintext token is sent in the email — never stored.
 *
 * Always returns 200 to prevent email enumeration.
 *
 * Security: rate limiting (5/min), token hashing (SHA-256)
 */

import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/auth/validation';
import { sql } from '@/lib/db';
import { randomBytes, createHash } from 'crypto';
import { sendEmail, passwordResetEmail } from '@/lib/email/send';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (strict — 5/min for email-sending endpoints)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateResult = checkRateLimit(`email:${ip}`, RATE_LIMITS.email);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up user
    const users = await sql`
      SELECT id, email, first_name FROM users WHERE email = ${email}
    `;

    if (users.length > 0) {
      const user = users[0];

      // Generate reset token (expires in 1 hour)
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Store SHA-256 hash of token — never store plaintext
      const tokenHash = createHash('sha256').update(resetToken).digest('hex');

      await sql`
        UPDATE users
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          resetTokenHash: tokenHash,
          resetExpires,
        })}::jsonb,
        updated_at = NOW()
        WHERE id = ${user.id}
      `;

      // Send plaintext token in email (user clicks link with token in URL)
      const resetEmailData = passwordResetEmail({
        firstName: user.first_name as string,
        resetToken,
      });
      sendEmail({ to: email, ...resetEmailData, tags: ['password-reset'] }).catch(() => {});

      // Log the token in development for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
