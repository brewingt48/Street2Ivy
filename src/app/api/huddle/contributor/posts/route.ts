/**
 * GET  /api/huddle/contributor/posts — List contributor's own posts
 * POST /api/huddle/contributor/posts — Submit a new post for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { z } from 'zod';
import { isAllowedVideoUrl } from '@/lib/huddle/utils';
import { sanitizeString } from '@/lib/security/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).default(''),
  body: z.string().max(100000).default(''),
  contentType: z.enum(['video', 'article', 'pdf', 'audio', 'text_post']),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  topicIds: z.array(z.string().uuid()).default([]),
});

async function getContributor(userId: string, tenantId: string) {
  const rows = await sql`
    SELECT id, is_active FROM huddle_contributors
    WHERE user_id = ${userId} AND tenant_id = ${tenantId}
  `;
  return rows.length > 0 ? rows[0] : null;
}

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

    const contributor = await getContributor(session.data.userId, tenantId);
    if (!contributor) {
      return NextResponse.json({ error: 'You are not a contributor', isContributor: false }, { status: 403 });
    }

    const posts = await sql`
      SELECT
        p.id, p.title, p.description, p.content_type, p.status,
        p.is_featured, p.is_pinned, p.rejection_note,
        p.published_at, p.created_at, p.updated_at,
        (SELECT COUNT(*)::int FROM huddle_views v WHERE v.post_id = p.id) AS view_count,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ht.id, 'name', ht.name)), '[]'::json)
          FROM huddle_post_topics pt
          JOIN huddle_topics ht ON ht.id = pt.topic_id
          WHERE pt.post_id = p.id
        ) AS topics
      FROM huddle_posts p
      WHERE p.contributor_id = ${contributor.id}
        AND p.tenant_id = ${tenantId}
      ORDER BY p.updated_at DESC
    `;

    return NextResponse.json({
      isContributor: true,
      contributorActive: contributor.is_active,
      posts: posts.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        contentType: p.content_type,
        status: p.status,
        isFeatured: p.is_featured,
        isPinned: p.is_pinned,
        rejectionNote: p.rejection_note,
        publishedAt: p.published_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        viewCount: p.view_count,
        topics: p.topics,
      })),
    });
  } catch (error) {
    console.error('Contributor posts list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const contributor = await getContributor(session.data.userId, tenantId);
    if (!contributor || !contributor.is_active) {
      return NextResponse.json({ error: 'You are not an active contributor' }, { status: 403 });
    }

    // Rate limit
    const rl = checkRateLimit(`huddle:contributor:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limited. Try again shortly.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    if (data.contentType === 'video' && data.mediaUrl && !isAllowedVideoUrl(data.mediaUrl)) {
      return NextResponse.json({ error: 'Video URL must be from YouTube or Vimeo' }, { status: 400 });
    }

    const title = sanitizeString(data.title);

    const result = await sql`
      INSERT INTO huddle_posts (
        tenant_id, contributor_id, content_type, title, description, body,
        media_url, thumbnail_url, status
      )
      VALUES (
        ${tenantId}, ${contributor.id}, ${data.contentType},
        ${title}, ${sanitizeString(data.description || '')}, ${data.body || ''},
        ${data.mediaUrl || null}, ${data.thumbnailUrl || null},
        'pending_review'
      )
      RETURNING id, title, status, created_at
    `;

    const postId = result[0].id as string;

    // Link topics
    for (const topicId of data.topicIds) {
      await sql`INSERT INTO huddle_post_topics (post_id, topic_id) VALUES (${postId}, ${topicId}) ON CONFLICT DO NOTHING`;
    }

    // Notify edu admins
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      SELECT u.id, 'huddle_post_submitted', 'New Team Huddle post for review',
        ${`A new post "${title}" has been submitted for review.`},
        ${JSON.stringify({ postId, title })}::jsonb
      FROM users u
      WHERE u.tenant_id = ${tenantId} AND u.role = 'educational_admin' AND u.is_active = true
    `;

    return NextResponse.json({ post: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Contributor create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
