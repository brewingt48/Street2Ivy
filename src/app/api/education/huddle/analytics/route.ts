/**
 * GET /api/education/huddle/analytics — Team Huddle engagement analytics
 *
 * Query params: period (7d, 30d, 90d, all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date filter
    let dateFilter = sql``;
    if (period === '7d') dateFilter = sql`AND v.viewed_at > NOW() - INTERVAL '7 days'`;
    else if (period === '30d') dateFilter = sql`AND v.viewed_at > NOW() - INTERVAL '30 days'`;
    else if (period === '90d') dateFilter = sql`AND v.viewed_at > NOW() - INTERVAL '90 days'`;

    let publishedDateFilter = sql``;
    if (period === '7d') publishedDateFilter = sql`AND p.published_at > NOW() - INTERVAL '7 days'`;
    else if (period === '30d') publishedDateFilter = sql`AND p.published_at > NOW() - INTERVAL '30 days'`;
    else if (period === '90d') publishedDateFilter = sql`AND p.published_at > NOW() - INTERVAL '90 days'`;

    // Run queries in parallel
    const [
      summaryResult,
      viewsOverTimeResult,
      contentTypeResult,
      topPostsResult,
      topContributorsResult,
      topTopicsResult,
    ] = await Promise.all([
      // Summary stats
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM huddle_posts WHERE tenant_id = ${tenantId}) AS total_posts,
          (SELECT COUNT(*)::int FROM huddle_posts WHERE tenant_id = ${tenantId} AND status = 'published') AS published_posts,
          (SELECT COUNT(*)::int FROM huddle_posts WHERE tenant_id = ${tenantId} AND status = 'pending_review') AS pending_posts,
          (SELECT COUNT(*)::int FROM huddle_views v WHERE v.tenant_id = ${tenantId} ${dateFilter}) AS total_views,
          (SELECT COUNT(*)::int FROM huddle_bookmarks WHERE tenant_id = ${tenantId}) AS total_bookmarks,
          (SELECT COUNT(*)::int FROM huddle_contributors WHERE tenant_id = ${tenantId} AND is_active = true) AS active_contributors
      `,

      // Views over time (daily)
      sql`
        SELECT
          DATE(v.viewed_at) AS date,
          COUNT(*)::int AS views
        FROM huddle_views v
        WHERE v.tenant_id = ${tenantId} ${dateFilter}
        GROUP BY DATE(v.viewed_at)
        ORDER BY date ASC
      `,

      // Content type breakdown
      sql`
        SELECT
          p.content_type,
          COUNT(*)::int AS count
        FROM huddle_posts p
        WHERE p.tenant_id = ${tenantId} AND p.status = 'published'
        GROUP BY p.content_type
      `,

      // Top posts by views
      sql`
        SELECT
          p.id, p.title, p.content_type,
          (SELECT COUNT(*)::int FROM huddle_views v WHERE v.post_id = p.id ${dateFilter}) AS views,
          (SELECT COUNT(*)::int FROM huddle_bookmarks b WHERE b.post_id = p.id) AS bookmarks
        FROM huddle_posts p
        WHERE p.tenant_id = ${tenantId} AND p.status = 'published'
        ORDER BY views DESC
        LIMIT 10
      `,

      // Top contributors
      sql`
        SELECT
          u.display_name AS name,
          c.role,
          COUNT(DISTINCT p.id)::int AS post_count,
          (SELECT COUNT(*)::int FROM huddle_views v
           JOIN huddle_posts pp ON pp.id = v.post_id
           WHERE pp.contributor_id = c.id ${dateFilter}) AS total_views
        FROM huddle_contributors c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN huddle_posts p ON p.contributor_id = c.id AND p.status = 'published'
        WHERE c.tenant_id = ${tenantId} AND c.is_active = true
        GROUP BY c.id, u.display_name, c.role
        ORDER BY total_views DESC
        LIMIT 10
      `,

      // Top topics by views
      sql`
        SELECT
          t.name,
          COUNT(DISTINCT v.id)::int AS views
        FROM huddle_topics t
        JOIN huddle_post_topics pt ON pt.topic_id = t.id
        JOIN huddle_posts p ON p.id = pt.post_id AND p.status = 'published'
        LEFT JOIN huddle_views v ON v.post_id = p.id ${dateFilter}
        WHERE t.tenant_id = ${tenantId}
        GROUP BY t.id, t.name
        ORDER BY views DESC
        LIMIT 10
      `,
    ]);

    const summary = summaryResult[0];
    const typeLabels: Record<string, string> = {
      video: 'Videos', article: 'Articles', pdf: 'PDFs', audio: 'Audio', text_post: 'Posts',
    };

    return NextResponse.json({
      summary: {
        totalPosts: summary.total_posts,
        publishedPosts: summary.published_posts,
        pendingPosts: summary.pending_posts,
        totalViews: summary.total_views,
        totalBookmarks: summary.total_bookmarks,
        activeContributors: summary.active_contributors,
      },
      viewsOverTime: viewsOverTimeResult.map((r: Record<string, unknown>) => ({
        date: r.date,
        views: r.views,
      })),
      contentTypeBreakdown: contentTypeResult.map((r: Record<string, unknown>) => ({
        name: typeLabels[r.content_type as string] || r.content_type,
        value: r.count,
      })),
      topPosts: topPostsResult.map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        contentType: r.content_type,
        views: r.views,
        bookmarks: r.bookmarks,
      })),
      topContributors: topContributorsResult.map((r: Record<string, unknown>) => ({
        name: r.name,
        role: r.role,
        postCount: r.post_count,
        totalViews: r.total_views,
      })),
      topTopics: topTopicsResult.map((r: Record<string, unknown>) => ({
        name: r.name,
        views: r.views,
      })),
    });
  } catch (error) {
    console.error('Huddle analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
