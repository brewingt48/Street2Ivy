/**
 * GET  /api/education/huddle/posts — List all posts for the tenant (admin view, all statuses)
 * POST /api/education/huddle/posts — Create a new Team Huddle post (admin can publish directly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { z } from 'zod';
import { generateSlug, isAllowedVideoUrl } from '@/lib/huddle/utils';
import { sanitizeString } from '@/lib/security/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).default(''),
  body: z.string().max(100000).default(''),
  contentType: z.enum(['video', 'article', 'pdf', 'audio', 'text_post']),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  topicIds: z.array(z.string().uuid()).default([]),
  contributorId: z.string().uuid().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const contentType = searchParams.get('type') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const searchFilter = q
      ? sql`AND (p.title ILIKE ${`%${q}%`} OR p.description ILIKE ${`%${q}%`})`
      : sql``;
    const statusFilter = status ? sql`AND p.status = ${status}` : sql``;
    const typeFilter = contentType ? sql`AND p.content_type = ${contentType}` : sql``;

    // Get status counts
    const statusCounts = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM huddle_posts
      WHERE tenant_id = ${tenantId}
      GROUP BY status
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM huddle_posts p
      WHERE p.tenant_id = ${tenantId}
        ${searchFilter} ${statusFilter} ${typeFilter}
    `;
    const total = countResult[0]?.total || 0;

    const posts = await sql`
      SELECT
        p.id, p.title, p.description, p.content_type, p.status,
        p.is_featured, p.is_pinned, p.published_at, p.created_at, p.updated_at,
        p.rejection_note,
        c.id AS contributor_id,
        u.display_name AS contributor_name,
        c.role AS contributor_role,
        (SELECT COUNT(*)::int FROM huddle_views v WHERE v.post_id = p.id) AS view_count,
        (SELECT COUNT(*)::int FROM huddle_bookmarks b WHERE b.post_id = p.id) AS bookmark_count,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ht.id, 'name', ht.name, 'slug', ht.slug)), '[]'::json)
          FROM huddle_post_topics pt
          JOIN huddle_topics ht ON ht.id = pt.topic_id
          WHERE pt.post_id = p.id
        ) AS topics
      FROM huddle_posts p
      LEFT JOIN huddle_contributors c ON c.id = p.contributor_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE p.tenant_id = ${tenantId}
        ${searchFilter} ${statusFilter} ${typeFilter}
      ORDER BY p.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      posts: posts.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        contentType: p.content_type,
        status: p.status,
        isFeatured: p.is_featured,
        isPinned: p.is_pinned,
        publishedAt: p.published_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        rejectionNote: p.rejection_note,
        contributorId: p.contributor_id,
        contributorName: p.contributor_name,
        contributorRole: p.contributor_role,
        viewCount: p.view_count,
        bookmarkCount: p.bookmark_count,
        topics: p.topics,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statusCounts: Object.fromEntries(
        statusCounts.map((r: Record<string, unknown>) => [r.status, r.count])
      ),
    });
  } catch (error) {
    console.error('Admin huddle posts list error:', error);
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
    if (!tenantId && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    // Rate limit
    const rl = checkRateLimit(`huddle:create:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limited. Try again shortly.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    // Validate video URL allowlist
    if (data.contentType === 'video' && data.mediaUrl && !isAllowedVideoUrl(data.mediaUrl)) {
      return NextResponse.json({ error: 'Video URL must be from YouTube or Vimeo' }, { status: 400 });
    }

    // Sanitize text fields
    const title = sanitizeString(data.title) || data.title;
    const description = sanitizeString(data.description || '') || '';
    const slug = generateSlug(title);

    // If contributorId not provided, auto-create/find admin contributor
    let contributorId = data.contributorId;
    if (!contributorId) {
      const existing = await sql`
        SELECT id FROM huddle_contributors
        WHERE tenant_id = ${tenantId} AND user_id = ${session.data.userId}
      `;
      if (existing.length > 0) {
        contributorId = existing[0].id as string;
      } else {
        const created = await sql`
          INSERT INTO huddle_contributors (tenant_id, user_id, role)
          VALUES (${tenantId}, ${session.data.userId}, 'admin')
          RETURNING id
        `;
        contributorId = created[0].id as string;
      }
    }

    const result = await sql`
      INSERT INTO huddle_posts (
        tenant_id, contributor_id, content_type, title, description, body,
        media_url, thumbnail_url, status, is_featured, is_pinned,
        published_at
      )
      VALUES (
        ${tenantId}, ${contributorId}, ${data.contentType},
        ${title}, ${description}, ${data.body || ''},
        ${data.mediaUrl || null}, ${data.thumbnailUrl || null},
        ${data.status}, ${data.isFeatured}, ${data.isPinned},
        ${data.status === 'published' ? sql`NOW()` : null}
      )
      RETURNING id, title, status, created_at
    `;

    const postId = result[0].id as string;

    // Link topics
    if (data.topicIds.length > 0) {
      for (const topicId of data.topicIds) {
        await sql`
          INSERT INTO huddle_post_topics (post_id, topic_id)
          VALUES (${postId}, ${topicId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Audit log
    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id, metadata)
      VALUES (${tenantId}, ${session.data.userId}, ${data.status === 'published' ? 'post_published' : 'post_created'}, 'post', ${postId}, ${JSON.stringify({ title })}::jsonb)
    `;

    return NextResponse.json({ post: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin create huddle post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
