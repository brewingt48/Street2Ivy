/**
 * POST /api/auth/forgot-password
 *
 * Generate a password reset token and send a reset email.
 * Stores the token in the user's metadata JSONB field.
 *
 * Always returns 200 to prevent email enumeration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/auth/validation';
import { sql } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
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

      // Store token in user metadata
      await sql`
        UPDATE users
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          resetToken,
          resetExpires,
        })}::jsonb,
        updated_at = NOW()
        WHERE id = ${user.id}
      `;

      // TODO: Send password reset email via Mailgun
      // For now, log the token (only in development)
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
