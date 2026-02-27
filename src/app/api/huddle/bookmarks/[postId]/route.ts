/**
 * POST /api/huddle/bookmarks/:postId — Toggle bookmark on/off
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
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

    const rl = checkRateLimit(`huddle:bookmark:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { postId } = await params;
    const userId = session.data.userId;

    // Verify post exists and belongs to tenant
    const post = await sql`
      SELECT id FROM huddle_posts
      WHERE id = ${postId} AND tenant_id = ${tenantId} AND status = 'published'
    `;
    if (post.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if bookmark exists
    const existing = await sql`
      SELECT id FROM huddle_bookmarks
      WHERE user_id = ${userId} AND post_id = ${postId}
    `;

    if (existing.length > 0) {
      // Remove bookmark
      await sql`DELETE FROM huddle_bookmarks WHERE user_id = ${userId} AND post_id = ${postId}`;
      return NextResponse.json({ bookmarked: false });
    } else {
      // Add bookmark
      await sql`
        INSERT INTO huddle_bookmarks (tenant_id, user_id, post_id)
        VALUES (${tenantId}, ${userId}, ${postId})
      `;
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Huddle bookmark toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
