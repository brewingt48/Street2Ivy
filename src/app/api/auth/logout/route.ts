/**
 * POST /api/auth/logout
 *
 * Destroy the session and clear the cookie.
 * Returns the tenant subdomain so the client can redirect to the right homepage.
 */

import { NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth/session';
import { getSessionCookie, deleteSessionCookie } from '@/lib/auth/cookies';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    const sid = getSessionCookie();
    let subdomain: string | null = null;

    if (sid) {
      // Get tenant subdomain before destroying session
      const session = await getSession(sid);
      if (session?.data?.tenantId) {
        const rows = await sql`SELECT subdomain FROM tenants WHERE id = ${session.data.tenantId}`;
        if (rows.length > 0) {
          subdomain = rows[0].subdomain as string;
        }
      }

      await deleteSession(sid);
      deleteSessionCookie();
    }

    return NextResponse.json({ success: true, subdomain });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
