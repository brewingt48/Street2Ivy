/**
 * POST /api/auth/logout
 *
 * Destroy the session and clear the cookie.
 */

import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { getSessionCookie, deleteSessionCookie } from '@/lib/auth/cookies';

export async function POST() {
  try {
    const sid = getSessionCookie();

    if (sid) {
      await deleteSession(sid);
      deleteSessionCookie();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
