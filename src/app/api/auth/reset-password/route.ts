/**
 * POST /api/auth/reset-password
 *
 * Reset a user's password using a valid reset token.
 * Token is verified from the user's metadata JSONB field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/auth/validation';
import { updatePassword } from '@/lib/auth/password';
import { deleteUserSessions } from '@/lib/auth/session';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Find user with matching reset token
    const users = await sql`
      SELECT id, email
      FROM users
      WHERE metadata->>'resetToken' = ${token}
        AND (metadata->>'resetExpires')::timestamptz > NOW()
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Update password via PostgreSQL crypt()
    await updatePassword(user.id, password);

    // Clear reset token from metadata
    await sql`
      UPDATE users
      SET metadata = metadata - 'resetToken' - 'resetExpires',
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Invalidate all existing sessions for this user
    await deleteUserSessions(user.id);

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
