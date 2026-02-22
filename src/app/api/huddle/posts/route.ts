/**
 * GET /api/huddle/posts — List published Team Huddle posts for the user's tenant
 *
 * Query params: q (search), topic (slug), type (content_type), sort (newest|popular), page, limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    // Premium gate
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const topicSlug = searchParams.get('topic') || '';
    const contentType = searchParams.get('type') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const userId = session.data.userId;

    // Build dynamic WHERE conditions
    const searchFilter = q
      ? sql`AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p.body, '')) @@ plainto_tsquery('english', ${q})`
      : sql``;

    const topicFilter = topicSlug
      ? sql`AND EXISTS (
        SELECT 1 FROM huddle_post_topics pt
        JOIN huddle_topics t ON t.id = pt.topic_id
        WHERE pt.post_id = p.id AND t.slug = ${topicSlug}
      )`
      : sql``;

    const typeFilter = contentType
      ? sql`AND p.content_type = ${contentType}`
      : sql``;

    const featured = searchParams.get('featured') === 'true';
    const featuredFilter = featured
      ? sql`AND (p.is_featured = true OR p.is_pinned = true)`
      : sql``;

    const orderBy = sort === 'popular'
      ? sql`p.is_pinned DESC, view_count DESC, p.published_at DESC`
      : sql`p.is_pinned DESC, p.published_at DESC`;

    // Count total
    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM huddle_posts p
      WHERE p.tenant_id = ${tenantId}
        AND p.status = 'published'
        ${searchFilter}
        ${topicFilter}
        ${typeFilter}
        ${featuredFilter}
    `;
    const total = countResult[0]?.total || 0;

    // Fetch posts with contributor info, bookmark status, topics
    const posts = await sql`
      SELECT
        p.id, p.title, p.description, p.content_type, p.media_url, p.thumbnail_url,
        p.is_featured, p.is_pinned, p.published_at, p.created_at,
        c.id AS contributor_id,
        u.display_name AS contributor_name,
        u.avatar_url AS contributor_avatar,
        c.role AS contributor_role,
        c.class_year AS contributor_class_year,
        c.title AS contributor_title,
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
      WHERE p.tenant_id = ${tenantId}
        AND p.status = 'published'
        ${searchFilter}
        ${topicFilter}
        ${typeFilter}
        ${featuredFilter}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({
      posts: posts.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        contentType: p.content_type,
        mediaUrl: p.media_url,
        thumbnailUrl: p.thumbnail_url,
        isFeatured: p.is_featured,
        isPinned: p.is_pinned,
        publishedAt: p.published_at,
        createdAt: p.created_at,
        contributorId: p.contributor_id,
        contributorName: p.contributor_name,
        contributorAvatar: p.contributor_avatar,
        contributorRole: p.contributor_role,
        contributorClassYear: p.contributor_class_year,
        contributorTitle: p.contributor_title,
        viewCount: p.view_count,
        bookmarkCount: p.bookmark_count,
        isBookmarked: p.is_bookmarked,
        topics: p.topics,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Huddle posts list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
