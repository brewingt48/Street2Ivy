/**
 * GET /api/direct-messages/:threadId — Get messages in a DM thread
 * POST /api/direct-messages/:threadId — Reply in a DM thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const replySchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    // Verify user is part of this thread
    const threadCheck = await sql`
      SELECT sender_id, recipient_id FROM direct_messages
      WHERE thread_id = ${params.threadId}
        AND (sender_id = ${userId} OR recipient_id = ${userId})
      LIMIT 1
    `;

    if (threadCheck.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const messages = await sql`
      SELECT id, sender_id, sender_name, sender_type, recipient_id, recipient_name,
             recipient_type, subject, content, read_at, created_at
      FROM direct_messages
      WHERE thread_id = ${params.threadId}
      ORDER BY created_at ASC
    `;

    // Mark messages as read
    await sql`
      UPDATE direct_messages
      SET read_at = NOW()
      WHERE thread_id = ${params.threadId}
        AND recipient_id = ${userId}
        AND read_at IS NULL
    `;

    // Determine other party
    const firstMsg = messages[0];
    const otherPartyId = firstMsg.sender_id === userId ? firstMsg.recipient_id : firstMsg.sender_id;
    const otherPartyName = firstMsg.sender_id === userId ? firstMsg.recipient_name : firstMsg.sender_name;

    return NextResponse.json({
      threadId: params.threadId,
      otherParty: {
        id: otherPartyId,
        name: otherPartyName,
      },
      messages: messages.map((m: Record<string, unknown>) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        content: m.content,
        readAt: m.read_at,
        createdAt: m.created_at,
        isOwn: m.sender_id === userId,
      })),
    });
  } catch (error) {
    console.error('DM thread error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    // Get thread info to determine recipient
    const threadMsg = await sql`
      SELECT sender_id, sender_name, sender_type, recipient_id, recipient_name, recipient_type, subject
      FROM direct_messages
      WHERE thread_id = ${params.threadId}
        AND (sender_id = ${userId} OR recipient_id = ${userId})
      ORDER BY created_at DESC LIMIT 1
    `;

    if (threadMsg.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const last = threadMsg[0];
    const recipientId = last.sender_id === userId ? last.recipient_id : last.sender_id;
    const recipientName = last.sender_id === userId ? last.recipient_name : last.sender_name;
    const recipientType = last.sender_id === userId ? last.recipient_type : last.sender_type;

    // Get sender info
    const users = await sql`SELECT display_name, role FROM users WHERE id = ${userId}`;
    const senderName = (users[0]?.display_name as string) || 'Unknown';
    const senderRole = (users[0]?.role as string) || 'student';

    const result = await sql`
      INSERT INTO direct_messages (thread_id, sender_id, sender_name, sender_type, recipient_id, recipient_name, recipient_type, subject, content)
      VALUES (
        ${params.threadId}, ${userId}, ${senderName}, ${senderRole},
        ${recipientId}, ${recipientName}, ${recipientType},
        ${last.subject || null}, ${parsed.data.content}
      )
      RETURNING id, sender_id, sender_name, content, created_at
    `;

    // Notify recipient
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${recipientId},
        'direct_message',
        'New Message',
        ${senderName + ' sent you a message'},
        ${JSON.stringify({ threadId: params.threadId, messageId: result[0].id })}::jsonb
      )
    `;

    const msg = result[0];
    return NextResponse.json({
      message: {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        content: msg.content,
        createdAt: msg.created_at,
        isOwn: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('DM reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
