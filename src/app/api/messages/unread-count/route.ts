/**
 * GET /api/messages/unread-count — Total unread message count for notification badge
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    // Count unread application messages
    const appUnread = await sql`
      SELECT COUNT(*) as count FROM application_messages am
      JOIN project_applications pa ON pa.id = am.application_id
      WHERE (pa.student_id = ${userId} OR pa.corporate_id = ${userId})
        AND am.sender_id != ${userId}
        AND am.read_at IS NULL
    `;

    // Count unread direct messages
    const dmUnread = await sql`
      SELECT COUNT(*) as count FROM direct_messages
      WHERE recipient_id = ${userId} AND read_at IS NULL
    `;

    // Count unread education messages
    const eduUnread = await sql`
      SELECT COUNT(*) as count FROM education_messages
      WHERE recipient_id = ${userId} AND is_read = false
    `;

    // Count unread admin messages
    const adminUnread = await sql`
      SELECT COUNT(*) as count FROM admin_messages
      WHERE recipient_id = ${userId} AND is_read = false
    `;

    // Count unread notifications
    const notifUnread = await sql`
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_id = ${userId} AND is_read = false
    `;

    const total =
      parseInt(appUnread[0].count as string) +
      parseInt(dmUnread[0].count as string) +
      parseInt(eduUnread[0].count as string) +
      parseInt(adminUnread[0].count as string);

    return NextResponse.json({
      total,
      applications: parseInt(appUnread[0].count as string),
      direct: parseInt(dmUnread[0].count as string),
      education: parseInt(eduUnread[0].count as string),
      admin: parseInt(adminUnread[0].count as string),
      notifications: parseInt(notifUnread[0].count as string),
    });
  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
