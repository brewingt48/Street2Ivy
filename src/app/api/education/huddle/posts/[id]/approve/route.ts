/**
 * POST /api/education/huddle/posts/:id/approve — Approve a pending post
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const rl = checkRateLimit(`huddle:approve:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await params;

    // Verify post exists, is pending, and belongs to tenant
    const posts = await sql`
      SELECT p.id, p.title, p.status, p.contributor_id, c.user_id AS contributor_user_id
      FROM huddle_posts p
      LEFT JOIN huddle_contributors c ON c.id = p.contributor_id
      WHERE p.id = ${id} AND p.tenant_id = ${tenantId}
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (posts[0].status !== 'pending_review') {
      return NextResponse.json({ error: 'Post is not pending review' }, { status: 400 });
    }

    // Approve
    await sql`
      UPDATE huddle_posts
      SET status = 'published', published_at = NOW(), updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    // Audit log
    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id, metadata)
      VALUES (${tenantId}, ${session.data.userId}, 'post_approved', 'post', ${id}, ${JSON.stringify({ title: posts[0].title })}::jsonb)
    `;

    // Notify contributor
    const contributorUserId = posts[0].contributor_user_id;
    if (contributorUserId) {
      await sql`
        INSERT INTO notifications (recipient_id, type, subject, content, data)
        VALUES (
          ${contributorUserId},
          'huddle_post_approved',
          'Your post has been published',
          ${`Your Team Huddle post "${posts[0].title}" has been approved and is now live.`},
          ${JSON.stringify({ postId: id, title: posts[0].title })}::jsonb
        )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approve huddle post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
