/**
 * PUT /api/huddle/contributor/posts/:id — Edit own draft/rejected post
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { isAllowedVideoUrl } from '@/lib/huddle/utils';
import { sanitizeString } from '@/lib/security/sanitize';

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  body: z.string().max(100000).optional(),
  contentType: z.enum(['video', 'article', 'pdf', 'audio', 'text_post']).optional(),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  topicIds: z.array(z.string().uuid()).optional(),
  resubmit: z.boolean().optional(), // true to change status back to pending_review
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const rl = checkRateLimit(`huddle:contributor:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await params;

    // Verify contributor owns this post
    const contributor = await sql`
      SELECT c.id FROM huddle_contributors c
      WHERE c.user_id = ${session.data.userId} AND c.tenant_id = ${tenantId} AND c.is_active = true
    `;
    if (contributor.length === 0) {
      return NextResponse.json({ error: 'You are not an active contributor' }, { status: 403 });
    }

    const post = await sql`
      SELECT id, status, contributor_id FROM huddle_posts
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (post.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post[0].contributor_id !== contributor[0].id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }
    if (!['draft', 'pending_review', 'rejected'].includes(post[0].status as string)) {
      return NextResponse.json({ error: 'Cannot edit a published or archived post' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const data = parsed.data;

    if (data.contentType === 'video' && data.mediaUrl && !isAllowedVideoUrl(data.mediaUrl)) {
      return NextResponse.json({ error: 'Video URL must be from YouTube or Vimeo' }, { status: 400 });
    }

    const newStatus = data.resubmit ? 'pending_review' : undefined;

    await sql`
      UPDATE huddle_posts SET
        title = COALESCE(${data.title ? sanitizeString(data.title) : null}, title),
        description = COALESCE(${data.description !== undefined ? sanitizeString(data.description || '') : null}, description),
        body = COALESCE(${data.body ?? null}, body),
        content_type = COALESCE(${data.contentType ?? null}, content_type),
        media_url = ${data.mediaUrl !== undefined ? (data.mediaUrl || null) : sql`media_url`},
        thumbnail_url = ${data.thumbnailUrl !== undefined ? (data.thumbnailUrl || null) : sql`thumbnail_url`},
        status = COALESCE(${newStatus ?? null}, status),
        rejection_note = ${newStatus === 'pending_review' ? null : sql`rejection_note`},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    if (data.topicIds !== undefined) {
      await sql`DELETE FROM huddle_post_topics WHERE post_id = ${id}`;
      for (const topicId of data.topicIds) {
        await sql`INSERT INTO huddle_post_topics (post_id, topic_id) VALUES (${id}, ${topicId}) ON CONFLICT DO NOTHING`;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contributor update post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
