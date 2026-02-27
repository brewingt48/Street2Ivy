/**
 * GET /api/auth/me
 *
 * Return the currently authenticated user's profile.
 * Used by client-side hooks to check auth state.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

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
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
