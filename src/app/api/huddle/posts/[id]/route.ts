/**
 * GET /api/huddle/posts/:id — Get a single published Team Huddle post
 *
 * Records a view (deduplicated: max 1 per user per post per 24 hours).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

export async function GET(
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

    const { id } = await params;
    const userId = session.data.userId;

    // Fetch post with contributor info
    const posts = await sql`
      SELECT
        p.id, p.title, p.description, p.body, p.content_type, p.media_url,
        p.file_key, p.file_name, p.thumbnail_url,
        p.is_featured, p.is_pinned, p.status, p.published_at, p.created_at,
        c.id AS contributor_id,
        u.display_name AS contributor_name,
        u.avatar_url AS contributor_avatar,
        c.role AS contributor_role,
        c.class_year AS contributor_class_year,
        c.title AS contributor_title,
        c.bio AS contributor_bio,
        (SELECT COUNT(*)::int FROM huddle_views v WHERE v.post_id = p.id) AS view_count,
        (SELECT COUNT(*)::int FROM huddle_bookmarks b WHERE b.post_id = p.id) AS bookmark_count,
        EXISTS(SELECT 1 FROM huddle_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${userId}) AS is_bookmarked,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ht.id, 'name', ht.name, 'slug', ht.slug)), '[]'::json)
          FROM huddle_post_topics pt
          JOIN huddle_topics ht ON ht.id = pt.topic_id
          WHERE pt.post_id = p.id
        ) AS topics
      FROM huddle_posts p
      LEFT JOIN huddle_contributors c ON c.id = p.contributor_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE p.id = ${id}
        AND p.tenant_id = ${tenantId}
        AND p.status = 'published'
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const p = posts[0];

    // Record view (deduplicate: max 1 per user per post per 24hrs) — fire and forget
    sql`
      INSERT INTO huddle_views (tenant_id, user_id, post_id)
      SELECT ${tenantId}, ${userId}, ${id}
      WHERE NOT EXISTS (
        SELECT 1 FROM huddle_views
        WHERE user_id = ${userId} AND post_id = ${id}
          AND viewed_at > NOW() - INTERVAL '24 hours'
      )
    `.catch(() => { /* ignore view tracking errors */ });

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
        isFeatured: p.is_featured,
        isPinned: p.is_pinned,
        status: p.status,
        publishedAt: p.published_at,
        createdAt: p.created_at,
        contributorId: p.contributor_id,
        contributorName: p.contributor_name,
        contributorAvatar: p.contributor_avatar,
        contributorRole: p.contributor_role,
        contributorClassYear: p.contributor_class_year,
        contributorTitle: p.contributor_title,
        contributorBio: p.contributor_bio,
        viewCount: p.view_count,
        bookmarkCount: p.bookmark_count,
        isBookmarked: p.is_bookmarked,
        topics: p.topics,
      },
    });
  } catch (error) {
    console.error('Huddle post detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
