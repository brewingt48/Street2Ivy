/**
 * GET /api/messages/application/:appId — Get messages in an application thread
 * POST /api/messages/application/:appId — Send a message in an application thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const sendSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    // Verify access
    const apps = await sql`
      SELECT id, student_id, corporate_id, student_name, corporate_name, listing_title, status
      FROM project_applications
      WHERE id = ${params.appId} AND (student_id = ${userId} OR corporate_id = ${userId})
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    const messages = await sql`
      SELECT id, sender_id, sender_name, sender_role, content, message_type, read_at, created_at
      FROM application_messages
      WHERE application_id = ${params.appId}
      ORDER BY created_at ASC
    `;

    // Mark unread messages as read
    await sql`
      UPDATE application_messages
      SET read_at = NOW()
      WHERE application_id = ${params.appId}
        AND sender_id != ${userId}
        AND read_at IS NULL
    `;

    return NextResponse.json({
      application: {
        id: app.id,
        studentId: app.student_id,
        corporateId: app.corporate_id,
        studentName: app.student_name,
        corporateName: app.corporate_name,
        listingTitle: app.listing_title,
        status: app.status,
      },
      messages: messages.map((m: Record<string, unknown>) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        content: m.content,
        messageType: m.message_type,
        readAt: m.read_at,
        createdAt: m.created_at,
        isOwn: m.sender_id === userId,
      })),
    });
  } catch (error) {
    console.error('Application messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    // Verify access and get details
    const apps = await sql`
      SELECT id, student_id, corporate_id, student_name, corporate_name, listing_title, status
      FROM project_applications
      WHERE id = ${params.appId} AND (student_id = ${userId} OR corporate_id = ${userId})
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    // Get sender info
    const users = await sql`SELECT display_name, role FROM users WHERE id = ${userId}`;
    const senderName = (users[0]?.display_name as string) || 'Unknown';
    const senderRole = users[0]?.role as string;

    const result = await sql`
      INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content)
      VALUES (${params.appId}, ${userId}, ${senderName}, ${senderRole}, ${parsed.data.content})
      RETURNING id, sender_id, sender_name, sender_role, content, message_type, created_at
    `;

    // Notify the other party
    const recipientId = app.student_id === userId ? app.corporate_id : app.student_id;
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${recipientId},
        'new_message',
        'New Message',
        ${senderName + ' sent a message regarding "' + app.listing_title + '"'},
        ${JSON.stringify({ applicationId: params.appId, listingTitle: app.listing_title })}::jsonb
      )
    `;

    const msg = result[0];
    return NextResponse.json({
      message: {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderRole: msg.sender_role,
        content: msg.content,
        messageType: msg.message_type,
        createdAt: msg.created_at,
        isOwn: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Send application message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
