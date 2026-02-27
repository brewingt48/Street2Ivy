/**
 * GET /api/huddle/topics — List active topics for the user's tenant
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const topics = await sql`
      SELECT
        t.id, t.name, t.slug, t.display_order,
        (SELECT COUNT(*)::int FROM huddle_post_topics pt
         JOIN huddle_posts p ON p.id = pt.post_id
         WHERE pt.topic_id = t.id AND p.status = 'published') AS post_count
      FROM huddle_topics t
      WHERE t.tenant_id = ${tenantId}
        AND t.is_active = true
      ORDER BY t.display_order ASC, t.name ASC
    `;

    return NextResponse.json({
      topics: topics.map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        displayOrder: t.display_order,
        postCount: t.post_count,
      })),
    });
  } catch (error) {
    console.error('Huddle topics list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
