/**
 * POST /api/education/huddle/posts/:id/reject — Reject a pending post with feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { sanitizeString } from '@/lib/security/sanitize';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

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

    const rl = checkRateLimit(`huddle:reject:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Verify post
    const posts = await sql`
      SELECT p.id, p.title, p.status, c.user_id AS contributor_user_id
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

    // Reject
    const reason = sanitizeString(parsed.data.reason);
    await sql`
      UPDATE huddle_posts
      SET status = 'rejected', rejection_note = ${reason}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    // Audit log
    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id, metadata)
      VALUES (${tenantId}, ${session.data.userId}, 'post_rejected', 'post', ${id}, ${JSON.stringify({ title: posts[0].title, reason: parsed.data.reason })}::jsonb)
    `;

    // Notify contributor
    const contributorUserId = posts[0].contributor_user_id;
    if (contributorUserId) {
      await sql`
        INSERT INTO notifications (recipient_id, type, subject, content, data)
        VALUES (
          ${contributorUserId},
          'huddle_post_rejected',
          'Your post needs revisions',
          ${`Your Team Huddle post "${posts[0].title}" needs revisions: ${parsed.data.reason}`},
          ${JSON.stringify({ postId: id, title: posts[0].title, reason: parsed.data.reason })}::jsonb
        )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject huddle post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
