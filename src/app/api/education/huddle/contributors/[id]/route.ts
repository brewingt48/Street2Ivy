/**
 * PUT    /api/education/huddle/contributors/:id — Update a contributor
 * DELETE /api/education/huddle/contributors/:id — Deactivate a contributor
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { sanitizeString } from '@/lib/security/sanitize';

const updateSchema = z.object({
  role: z.enum(['alumni', 'partner', 'admin']).optional(),
  title: z.string().max(200).optional().nullable(),
  classYear: z.string().max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const rl = checkRateLimit(`huddle:contributor:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = parsed.data;

    await sql`
      UPDATE huddle_contributors SET
        role = COALESCE(${data.role ?? null}, role),
        title = ${data.title !== undefined ? (data.title ? sanitizeString(data.title) : null) : sql`title`},
        class_year = ${data.classYear !== undefined ? (data.classYear || null) : sql`class_year`},
        bio = ${data.bio !== undefined ? (data.bio ? sanitizeString(data.bio) : null) : sql`bio`},
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update huddle contributor error:', error);
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
      UPDATE huddle_contributors SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin deactivate huddle contributor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
