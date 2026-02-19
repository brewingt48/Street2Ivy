/**
 * GET  /api/education/huddle/topics — List topics with post counts (admin)
 * POST /api/education/huddle/topics — Create a new topic
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { generateSlug } from '@/lib/huddle/utils';
import { sanitizeString } from '@/lib/security/sanitize';

const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(100).optional(),
  displayOrder: z.number().int().default(0),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const topics = await sql`
      SELECT
        t.id, t.name, t.slug, t.display_order, t.is_active, t.created_at,
        (SELECT COUNT(*)::int FROM huddle_post_topics pt WHERE pt.topic_id = t.id) AS post_count
      FROM huddle_topics t
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.display_order ASC, t.name ASC
    `;

    return NextResponse.json({
      topics: topics.map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        displayOrder: t.display_order,
        isActive: t.is_active,
        postCount: t.post_count,
        createdAt: t.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin huddle topics list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTopicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const rl = checkRateLimit(`huddle:topic:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const name = sanitizeString(parsed.data.name) || parsed.data.name;
    const slug = parsed.data.slug || generateSlug(name);

    // Check unique slug within tenant
    const existing = await sql`
      SELECT id FROM huddle_topics WHERE tenant_id = ${tenantId} AND slug = ${slug}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO huddle_topics (tenant_id, name, slug, display_order)
      VALUES (${tenantId}, ${name}, ${slug}, ${parsed.data.displayOrder})
      RETURNING id, name, slug, display_order, is_active, created_at
    `;

    return NextResponse.json({ topic: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin create huddle topic error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
