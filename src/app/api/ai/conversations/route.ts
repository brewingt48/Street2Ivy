/**
 * GET /api/ai/conversations — List user's conversations
 * POST /api/ai/conversations — Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contextType: z.string().max(50).optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    const rows = await sql`
      SELECT id, title, context_type, metadata, created_at, updated_at
      FROM ai_conversations
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    const conversations = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      title: r.title,
      contextType: r.context_type,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, contextType } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    const result = await sql`
      INSERT INTO ai_conversations (user_id, tenant_id, title, context_type)
      VALUES (
        ${userId},
        ${tenantId},
        ${title || 'New Conversation'},
        ${contextType || 'coaching'}
      )
      RETURNING id, title, context_type, created_at
    `;

    const row = result[0];
    return NextResponse.json({
      conversation: {
        id: row.id,
        title: row.title,
        contextType: row.context_type,
        createdAt: row.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
