/**
 * GET /api/messages/inbox — Unified inbox: conversation previews across all message types
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

    const userId = session.data.userId;
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'all'; // all, applications, direct, education, admin

    const conversations: Record<string, unknown>[] = [];

    // 1. Application message threads
    if (tab === 'all' || tab === 'applications') {
      const appThreads = await sql`
        SELECT
          pa.id as thread_id,
          'application' as thread_type,
          pa.listing_title as subject,
          CASE
            WHEN pa.student_id = ${userId} THEN pa.corporate_name
            ELSE pa.student_name
          END as other_party_name,
          CASE
            WHEN pa.student_id = ${userId} THEN pa.corporate_id
            ELSE pa.student_id
          END as other_party_id,
          pa.status as app_status,
          (SELECT content FROM application_messages WHERE application_id = pa.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM application_messages WHERE application_id = pa.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM application_messages WHERE application_id = pa.id AND sender_id != ${userId} AND read_at IS NULL) as unread_count
        FROM project_applications pa
        WHERE (pa.student_id = ${userId} OR pa.corporate_id = ${userId})
          AND EXISTS (SELECT 1 FROM application_messages WHERE application_id = pa.id)
        ORDER BY last_message_at DESC NULLS LAST
      `;
      for (const t of appThreads) {
        conversations.push({
          id: t.thread_id,
          type: 'application',
          subject: t.subject,
          otherPartyName: t.other_party_name,
          otherPartyId: t.other_party_id,
          lastMessage: t.last_message,
          lastMessageAt: t.last_message_at,
          unreadCount: parseInt(t.unread_count as string) || 0,
          metadata: { appStatus: t.app_status },
        });
      }
    }

    // 2. Direct message threads
    if (tab === 'all' || tab === 'direct') {
      const dmThreads = await sql`
        SELECT DISTINCT ON (thread_id)
          thread_id,
          'direct' as thread_type,
          subject,
          CASE
            WHEN sender_id = ${userId} THEN recipient_name
            ELSE sender_name
          END as other_party_name,
          CASE
            WHEN sender_id = ${userId} THEN recipient_id
            ELSE sender_id
          END as other_party_id,
          content as last_message,
          created_at as last_message_at
        FROM direct_messages
        WHERE sender_id = ${userId} OR recipient_id = ${userId}
        ORDER BY thread_id, created_at DESC
      `;

      for (const t of dmThreads) {
        const unreadResult = await sql`
          SELECT COUNT(*) as count FROM direct_messages
          WHERE thread_id = ${t.thread_id} AND recipient_id = ${userId} AND read_at IS NULL
        `;
        conversations.push({
          id: t.thread_id,
          type: 'direct',
          subject: t.subject || 'Direct Message',
          otherPartyName: t.other_party_name,
          otherPartyId: t.other_party_id,
          lastMessage: t.last_message,
          lastMessageAt: t.last_message_at,
          unreadCount: parseInt(unreadResult[0].count as string) || 0,
        });
      }
    }

    // 3. Education messages
    if (tab === 'all' || tab === 'education') {
      const eduMsgs = await sql`
        SELECT id, sender_id, sender_name, recipient_id, subject, content,
               sent_at as created_at, is_read
        FROM education_messages
        WHERE recipient_id = ${userId} OR sender_id = ${userId}
        ORDER BY sent_at DESC
        LIMIT 50
      `;

      // Group by conversation partner
      const eduGroups: Record<string, Record<string, unknown>> = {};
      for (const m of eduMsgs) {
        const partnerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
        const key = partnerId as string;
        if (!eduGroups[key]) {
          eduGroups[key] = {
            id: `edu-${key}`,
            type: 'education',
            subject: m.subject || 'Education Message',
            otherPartyName: m.sender_id === userId ? m.recipient_name : m.sender_name,
            otherPartyId: partnerId,
            lastMessage: m.content,
            lastMessageAt: m.created_at,
            unreadCount: 0,
          };
        }
        if (m.recipient_id === userId && !m.is_read) {
          (eduGroups[key].unreadCount as number)++;
        }
      }
      conversations.push(...Object.values(eduGroups));
    }

    // 4. Admin messages
    if (tab === 'all' || tab === 'admin') {
      const adminMsgs = await sql`
        SELECT id, sender_id, sender_name, subject, content, severity,
               is_read, created_at
        FROM admin_messages
        WHERE recipient_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `;

      for (const m of adminMsgs) {
        conversations.push({
          id: m.id,
          type: 'admin',
          subject: m.subject || 'System Message',
          otherPartyName: m.sender_name || 'Street2Ivy',
          otherPartyId: m.sender_id,
          lastMessage: m.content,
          lastMessageAt: m.created_at,
          unreadCount: m.is_read ? 0 : 1,
          metadata: { severity: m.severity },
        });
      }
    }

    // Sort all conversations by lastMessageAt DESC
    conversations.sort((a, b) => {
      const aTime = new Date(a.lastMessageAt as string).getTime() || 0;
      const bTime = new Date(b.lastMessageAt as string).getTime() || 0;
      return bTime - aTime;
    });

    // Calculate total unread
    const totalUnread = conversations.reduce((sum, c) => sum + ((c.unreadCount as number) || 0), 0);

    return NextResponse.json({ conversations, totalUnread });
  } catch (error) {
    console.error('Inbox error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
