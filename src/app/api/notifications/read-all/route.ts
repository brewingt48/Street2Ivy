/**
 * POST /api/notifications/read-all — Mark all notifications as read
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await sql`
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE recipient_id = ${session.data.userId} AND is_read = false
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
