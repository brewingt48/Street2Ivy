/**
 * POST /api/auth/verify-email
 *
 * Verify a user's email address using a verification token.
 * Token is stored in the user's metadata JSONB field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Find user with matching verification token
    const users = await sql`
      SELECT id, email
      FROM users
      WHERE metadata->>'emailVerificationToken' = ${token}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Mark email as verified and clear the token
    await sql`
      UPDATE users
      SET email_verified = true,
          metadata = metadata - 'emailVerificationToken',
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
