/**
 * GET /api/huddle/landing — Combined data for the branded Team Huddle landing page
 *
 * Returns branding config, featured posts, topic-grouped posts, recent posts, and topics
 * in a single API call for optimal landing page load performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

export const dynamic = 'force-dynamic';

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

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan', upgradeRequired: true }, { status: 403 });
    }

    const userId = session.data.userId;

    // Run all queries in parallel for performance
    const [brandingResult, featuredPosts, recentPosts, topics] = await Promise.all([
      // 1. Branding config (merged with tenant defaults)
      sql`
        SELECT
          hb.banner_type,
          hb.banner_image_url,
          hb.banner_video_url,
          hb.banner_overlay_opacity,
          hb.logo_url AS huddle_logo_url,
          hb.primary_color AS huddle_primary_color,
          hb.secondary_color AS huddle_secondary_color,
          hb.welcome_title,
          hb.welcome_message,
          hb.layout_config,
          t.display_name AS tenant_name,
          t.name AS tenant_full_name,
          t.branding AS tenant_branding
        FROM tenants t
        LEFT JOIN huddle_branding hb ON hb.tenant_id = t.id
        WHERE t.id = ${tenantId}
      `,

      // 2. Featured/pinned posts (up to 6)
      sql`
        SELECT
          p.id, p.title, p.description, p.content_type, p.media_url, p.thumbnail_url,
          p.is_featured, p.is_pinned, p.published_at,
          u.display_name AS contributor_name,
          u.avatar_url AS contributor_avatar,
          c.role AS contributor_role,
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
          AND (p.is_featured = true OR p.is_pinned = true)
        ORDER BY p.is_pinned DESC, p.published_at DESC
        LIMIT 6
      `,

      // 3. Recent posts (up to 8)
      sql`
        SELECT
          p.id, p.title, p.description, p.content_type, p.media_url, p.thumbnail_url,
          p.is_featured, p.is_pinned, p.published_at,
          u.display_name AS contributor_name,
          u.avatar_url AS contributor_avatar,
          c.role AS contributor_role,
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
        ORDER BY p.published_at DESC
        LIMIT 8
      `,

      // 4. Active topics with post counts
      sql`
        SELECT
          t.id, t.name, t.slug, t.display_order,
          COUNT(DISTINCT pt.post_id)::int AS post_count
        FROM huddle_topics t
        LEFT JOIN huddle_post_topics pt ON pt.topic_id = t.id
        LEFT JOIN huddle_posts p ON p.id = pt.post_id AND p.status = 'published'
        WHERE t.tenant_id = ${tenantId} AND t.is_active = true
        GROUP BY t.id, t.name, t.slug, t.display_order
        ORDER BY t.display_order ASC, t.name ASC
      `,
    ]);

    // Build branding response
    const br = brandingResult[0];
    const tenantBranding = (br?.tenant_branding as Record<string, string>) || {};
    const layoutConfig = (br?.layout_config as Record<string, unknown>) || {};

    const branding = {
      bannerType: br?.banner_type || 'image',
      bannerImageUrl: br?.banner_image_url || null,
      bannerVideoUrl: br?.banner_video_url || null,
      bannerOverlayOpacity: br?.banner_overlay_opacity != null ? Number(br.banner_overlay_opacity) : 0.4,
      logoUrl: br?.huddle_logo_url || tenantBranding.logoUrl || null,
      primaryColor: br?.huddle_primary_color || tenantBranding.primaryColor || '#0f766e',
      secondaryColor: br?.huddle_secondary_color || tenantBranding.secondaryColor || '#f8fafc',
      welcomeTitle: br?.welcome_title || null,
      welcomeMessage: br?.welcome_message || null,
      layoutConfig,
      tenantName: br?.display_name || br?.tenant_full_name || 'Team Huddle',
    };

    // Format posts helper
    const formatPost = (p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      contentType: p.content_type,
      mediaUrl: p.media_url,
      thumbnailUrl: p.thumbnail_url,
      isFeatured: p.is_featured,
      isPinned: p.is_pinned,
      publishedAt: p.published_at,
      contributorName: p.contributor_name,
      contributorAvatar: p.contributor_avatar,
      contributorRole: p.contributor_role,
      viewCount: p.view_count,
      bookmarkCount: p.bookmark_count,
      isBookmarked: p.is_bookmarked,
      topics: p.topics,
    });

    // Build topic sections — fetch posts for configured topics (up to 4 per topic)
    const configuredTopicSections = (layoutConfig.topicSections as Array<{ topicId: string; title?: string; order: number }>) || [];
    const topicsWithPosts = topics.filter((t: Record<string, unknown>) => (t.post_count as number) > 0);

    // Use configured topic sections if any, otherwise auto-generate from topics with posts
    const topicIds = configuredTopicSections.length > 0
      ? configuredTopicSections.map(ts => ts.topicId)
      : topicsWithPosts.slice(0, 5).map((t: Record<string, unknown>) => t.id as string);

    let topicSections: Array<{ topicId: string; title: string; slug: string; posts: unknown[] }> = [];

    if (topicIds.length > 0) {
      // Fetch posts for each topic (batch query)
      const topicPosts = await sql`
        SELECT DISTINCT ON (pt.topic_id, p.published_at, p.id)
          pt.topic_id,
          p.id, p.title, p.description, p.content_type, p.media_url, p.thumbnail_url,
          p.is_featured, p.is_pinned, p.published_at,
          u.display_name AS contributor_name,
          u.avatar_url AS contributor_avatar,
          c.role AS contributor_role,
          (SELECT COUNT(*)::int FROM huddle_views v WHERE v.post_id = p.id) AS view_count,
          (SELECT COUNT(*)::int FROM huddle_bookmarks b WHERE b.post_id = p.id) AS bookmark_count,
          EXISTS(SELECT 1 FROM huddle_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${userId}) AS is_bookmarked,
          (
            SELECT COALESCE(json_agg(json_build_object('id', ht.id, 'name', ht.name, 'slug', ht.slug)), '[]'::json)
            FROM huddle_post_topics pt2
            JOIN huddle_topics ht ON ht.id = pt2.topic_id
            WHERE pt2.post_id = p.id
          ) AS topics
        FROM huddle_post_topics pt
        JOIN huddle_posts p ON p.id = pt.post_id
        LEFT JOIN huddle_contributors c ON c.id = p.contributor_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE pt.topic_id = ANY(${topicIds})
          AND p.tenant_id = ${tenantId}
          AND p.status = 'published'
        ORDER BY pt.topic_id, p.published_at DESC, p.id
      `;

      // Group posts by topic
      const postsByTopic: Record<string, unknown[]> = {};
      for (const p of topicPosts) {
        const tid = p.topic_id as string;
        if (!postsByTopic[tid]) postsByTopic[tid] = [];
        if (postsByTopic[tid].length < 4) {
          postsByTopic[tid].push(formatPost(p));
        }
      }

      // Build topic sections in configured order
      const topicLookup: Record<string, Record<string, unknown>> = {};
      for (const t of topics) {
        topicLookup[t.id as string] = t;
      }

      for (const topicId of topicIds) {
        const topic = topicLookup[topicId];
        if (!topic) continue;
        const posts = postsByTopic[topicId] || [];
        if (posts.length === 0) continue;

        // Use custom title from config if available
        const configSection = configuredTopicSections.find(ts => ts.topicId === topicId);
        topicSections.push({
          topicId,
          title: configSection?.title || (topic.name as string),
          slug: topic.slug as string,
          posts,
        });
      }
    }

    return NextResponse.json({
      branding,
      featured: featuredPosts.map(formatPost),
      topicSections,
      recent: recentPosts.map(formatPost),
      topics: topics.map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        postCount: t.post_count,
      })),
    });
  } catch (error) {
    console.error('Huddle landing data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
