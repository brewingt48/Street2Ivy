/**
 * GET    /api/education/huddle/posts/:id — Get single post for editing
 * PUT    /api/education/huddle/posts/:id — Update a post
 * DELETE /api/education/huddle/posts/:id — Archive a post (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { isAllowedVideoUrl } from '@/lib/huddle/utils';
import { sanitizeString } from '@/lib/security/sanitize';

const updatePostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  body: z.string().max(100000).optional(),
  contentType: z.enum(['video', 'article', 'pdf', 'audio', 'text_post']).optional(),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  contributorId: z.string().uuid().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  rejectionNote: z.string().max(1000).optional(),
});

export async function GET(
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

    const { id } = await params;

    const posts = await sql`
      SELECT
        p.*,
        c.id AS contributor_id,
        u.display_name AS contributor_name,
        c.role AS contributor_role,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ht.id, 'name', ht.name, 'slug', ht.slug)), '[]'::json)
          FROM huddle_post_topics pt
          JOIN huddle_topics ht ON ht.id = pt.topic_id
          WHERE pt.post_id = p.id
        ) AS topics
      FROM huddle_posts p
      LEFT JOIN huddle_contributors c ON c.id = p.contributor_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE p.id = ${id} AND p.tenant_id = ${tenantId}
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const p = posts[0];
    return NextResponse.json({
      post: {
        id: p.id,
        title: p.title,
        description: p.description,
        body: p.body,
        contentType: p.content_type,
        mediaUrl: p.media_url,
        fileKey: p.file_key,
        fileName: p.file_name,
        thumbnailUrl: p.thumbnail_url,
        status: p.status,
        isFeatured: p.is_featured,
        isPinned: p.is_pinned,
        rejectionNote: p.rejection_note,
        publishedAt: p.published_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        contributorId: p.contributor_id,
        contributorName: p.contributor_name,
        contributorRole: p.contributor_role,
        topics: p.topics,
      },
    });
  } catch (error) {
    console.error('Admin get huddle post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const rl = checkRateLimit(`huddle:post:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;

    // Verify post exists in tenant
    const existing = await sql`SELECT id, status FROM huddle_posts WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Validate video URL if updating
    if (data.contentType === 'video' && data.mediaUrl && !isAllowedVideoUrl(data.mediaUrl)) {
      return NextResponse.json({ error: 'Video URL must be from YouTube, Vimeo, or Cloudinary' }, { status: 400 });
    }

    // Build typed update values
    const uTitle: string | null = data.title !== undefined ? sanitizeString(data.title) : null;
    const uDescription: string | null = data.description !== undefined ? sanitizeString(data.description || '') : null;
    const uBody: string | null = data.body !== undefined ? data.body : null;
    const uContentType: string | null = data.contentType !== undefined ? data.contentType : null;
    const uMediaUrl: string | null = data.mediaUrl !== undefined ? (data.mediaUrl || null) : null;
    const uThumbnailUrl: string | null = data.thumbnailUrl !== undefined ? (data.thumbnailUrl || null) : null;
    const uStatus: string | null = data.status !== undefined ? data.status : null;
    const uIsFeatured: boolean | null = data.isFeatured !== undefined ? data.isFeatured : null;
    const uIsPinned: boolean | null = data.isPinned !== undefined ? data.isPinned : null;
    const uRejectionNote: string | null = data.rejectionNote !== undefined ? (data.rejectionNote || null) : null;
    const uContributorId: string | null = data.contributorId !== undefined ? (data.contributorId || null) : null;
    const shouldSetPublishedAt = data.status === 'published' && existing[0].status !== 'published';

    const updatedFields = Object.keys(data);

    await sql`
      UPDATE huddle_posts SET
        title = COALESCE(${uTitle}, title),
        description = COALESCE(${uDescription}, description),
        body = COALESCE(${uBody}, body),
        content_type = COALESCE(${uContentType}, content_type),
        media_url = CASE WHEN ${data.mediaUrl !== undefined} THEN ${uMediaUrl} ELSE media_url END,
        thumbnail_url = CASE WHEN ${data.thumbnailUrl !== undefined} THEN ${uThumbnailUrl} ELSE thumbnail_url END,
        status = COALESCE(${uStatus}, status),
        is_featured = COALESCE(${uIsFeatured}, is_featured),
        is_pinned = COALESCE(${uIsPinned}, is_pinned),
        rejection_note = CASE WHEN ${data.rejectionNote !== undefined} THEN ${uRejectionNote} ELSE rejection_note END,
        contributor_id = CASE WHEN ${data.contributorId !== undefined} THEN ${uContributorId} ELSE contributor_id END,
        published_at = CASE WHEN ${shouldSetPublishedAt} THEN NOW() ELSE published_at END,
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    // Update topics if provided
    if (data.topicIds !== undefined) {
      await sql`DELETE FROM huddle_post_topics WHERE post_id = ${id}`;
      for (const topicId of data.topicIds) {
        await sql`INSERT INTO huddle_post_topics (post_id, topic_id) VALUES (${id}, ${topicId}) ON CONFLICT DO NOTHING`;
      }
    }

    // Audit log
    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id, metadata)
      VALUES (${tenantId}, ${session.data.userId}, 'post_updated', 'post', ${id}, ${JSON.stringify({ updates: updatedFields })}::jsonb)
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update huddle post error:', error);
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
      UPDATE huddle_posts SET status = 'archived', updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id)
      VALUES (${tenantId}, ${session.data.userId}, 'post_archived', 'post', ${id})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete huddle post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
