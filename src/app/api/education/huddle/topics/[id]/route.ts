/**
 * PUT    /api/education/huddle/topics/:id — Update a topic
 * DELETE /api/education/huddle/topics/:id — Deactivate a topic
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { sanitizeString } from '@/lib/security/sanitize';

const updateTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const { id } = await params;

    const body = await request.json();
    const parsed = updateTopicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const rl = checkRateLimit(`huddle:topic:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = parsed.data;

    await sql`
      UPDATE huddle_topics SET
        name = COALESCE(${data.name ? sanitizeString(data.name) : null}, name),
        display_order = COALESCE(${data.displayOrder ?? null}, display_order),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update huddle topic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const { id } = await params;

    await sql`
      UPDATE huddle_topics SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete huddle topic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
