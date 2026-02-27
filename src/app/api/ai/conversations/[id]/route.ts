/**
 * GET /api/ai/conversations/:id — Get conversation with messages
 * DELETE /api/ai/conversations/:id — Delete conversation (cascade deletes messages)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.data.userId;

    // Fetch conversation and verify ownership
    const conversations = await sql`
      SELECT id, title, context_type, metadata, created_at, updated_at
      FROM ai_conversations
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (conversations.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversations[0];

    // Fetch all messages for this conversation
    const messages = await sql`
      SELECT id, role, content, metadata, created_at
      FROM ai_messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      conversation: {
        id: conv.id,
        title: conv.title,
        contextType: conv.context_type,
        metadata: conv.metadata,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      },
      messages: messages.map((m: Record<string, unknown>) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.created_at,
      })),
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.data.userId;

    // Verify ownership before deleting
    const conversations = await sql`
      SELECT id FROM ai_conversations
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (conversations.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Delete conversation (CASCADE will delete associated messages)
    await sql`
      DELETE FROM ai_conversations WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
