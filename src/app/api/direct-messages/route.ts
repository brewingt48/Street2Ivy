/**
 * POST /api/direct-messages — Start a new direct message thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const composeSchema = z.object({
  recipientId: z.string().uuid(),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    const body = await request.json();
    const parsed = composeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { recipientId, subject, content } = parsed.data;

    if (recipientId === userId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Get sender + recipient info
    const users = await sql`
      SELECT id, display_name, role FROM users WHERE id IN (${userId}, ${recipientId})
    `;

    const sender = users.find((u: Record<string, unknown>) => u.id === userId);
    const recipient = users.find((u: Record<string, unknown>) => u.id === recipientId);

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Check if thread already exists between these two users
    const existingThread = await sql`
      SELECT DISTINCT thread_id FROM direct_messages
      WHERE (sender_id = ${userId} AND recipient_id = ${recipientId})
         OR (sender_id = ${recipientId} AND recipient_id = ${userId})
      LIMIT 1
    `;

    const threadId = existingThread.length > 0 ? existingThread[0].thread_id as string : randomUUID();

    const result = await sql`
      INSERT INTO direct_messages (thread_id, sender_id, sender_name, sender_type, recipient_id, recipient_name, recipient_type, subject, content)
      VALUES (
        ${threadId},
        ${userId},
        ${(sender?.display_name as string) || 'Unknown'},
        ${(sender?.role as string) || 'student'},
        ${recipientId},
        ${(recipient.display_name as string) || 'Unknown'},
        ${(recipient.role as string) || 'student'},
        ${subject || null},
        ${content}
      )
      RETURNING id, thread_id, created_at
    `;

    // Notify recipient
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${recipientId},
        'direct_message',
        'New Direct Message',
        ${((sender?.display_name as string) || 'Someone') + ' sent you a message'},
        ${JSON.stringify({ threadId, messageId: result[0].id })}::jsonb
      )
    `;

    return NextResponse.json({
      message: result[0],
      threadId,
    }, { status: 201 });
  } catch (error) {
    console.error('Compose DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
