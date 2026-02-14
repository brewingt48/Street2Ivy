/**
 * GET /api/notifications — List user's notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const unreadOnly = searchParams.get('unread') === 'true';

    let notifications;
    if (unreadOnly) {
      notifications = await sql`
        SELECT id, type, subject, content, data, is_read, read_at, created_at
        FROM notifications
        WHERE recipient_id = ${session.data.userId} AND is_read = false
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      notifications = await sql`
        SELECT id, type, subject, content, data, is_read, read_at, created_at
        FROM notifications
        WHERE recipient_id = ${session.data.userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const unreadCount = await sql`
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_id = ${session.data.userId} AND is_read = false
    `;

    return NextResponse.json({
      notifications: notifications.map((n: Record<string, unknown>) => ({
        id: n.id,
        type: n.type,
        subject: n.subject,
        content: n.content,
        data: n.data,
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      unreadCount: parseInt(unreadCount[0].count as string),
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
