/**
 * GET /api/corporate/analytics — Corporate partner analytics and reporting
 *
 * Query params: range (7d|30d|90d|12mo|all)
 * Returns summary stats, application funnel, timeline, listing performance, top skills.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getDateRange, getTimelineInterval, type RangeKey } from '@/lib/analytics/date-ranges';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;
    const range = (request.nextUrl.searchParams.get('range') || '30d') as RangeKey;
    const { start, end } = getDateRange(range);
    const interval = getTimelineInterval(range);

    // Summary: listing counts
    const listingStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published') as active,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) as total
      FROM listings
      WHERE author_id = ${userId}
    `;

    // Summary: application stats in period
    const appStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM project_applications
      WHERE corporate_id = ${userId}
        AND submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
    `;

    const totalApps = parseInt(appStats[0].total as string);
    const acceptedApps = parseInt(appStats[0].accepted as string);
    const completedApps = parseInt(appStats[0].completed as string);

    // Avg time to fill (published_at → first accepted response)
    const avgTimeToFill = await sql`
      SELECT ROUND(AVG(
        EXTRACT(EPOCH FROM (pa.responded_at - l.published_at)) / 86400
      )::numeric, 1) as avg_days
      FROM project_applications pa
      JOIN listings l ON l.id = pa.listing_id
      WHERE pa.corporate_id = ${userId}
        AND pa.status = 'accepted'
        AND pa.responded_at IS NOT NULL
        AND l.published_at IS NOT NULL
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
    `;

    // Avg applicants per listing
    const avgApplicants = await sql`
      SELECT ROUND(AVG(app_count)::numeric, 1) as avg
      FROM (
        SELECT l.id, COUNT(pa.id) as app_count
        FROM listings l
        LEFT JOIN project_applications pa ON pa.listing_id = l.id
          AND pa.submitted_at >= ${start}::timestamp
          AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
        WHERE l.author_id = ${userId}
          AND l.status IN ('published', 'closed')
        GROUP BY l.id
      ) sub
    `;

    // Invite stats
    const inviteStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'declined') as declined
      FROM corporate_invites
      WHERE corporate_partner_id = ${userId}
        AND sent_at >= ${start}::timestamp
        AND sent_at <= ${end}::timestamp + interval '1 day'
    `;
    const totalInvites = parseInt(inviteStats[0].total as string);
    const acceptedInvites = parseInt(inviteStats[0].accepted as string);

    // Application funnel
    const funnelData = [
      { stage: 'Submitted', count: totalApps },
      { stage: 'Pending Review', count: parseInt(appStats[0].pending as string) },
      { stage: 'Accepted', count: acceptedApps },
      { stage: 'Completed', count: completedApps },
    ];

    // Application timeline
    const timeline = await sql`
      SELECT
        DATE_TRUNC(${interval}, submitted_at)::date as date,
        COUNT(*) as received,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted
      FROM project_applications
      WHERE corporate_id = ${userId}
        AND submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
      GROUP BY DATE_TRUNC(${interval}, submitted_at)
      ORDER BY date
    `;

    // Listing performance
    const listingPerf = await sql`
      SELECT
        l.id, l.title, l.status, l.published_at,
        COUNT(pa.id) as applicants,
        COUNT(pa.id) FILTER (WHERE pa.status = 'accepted') as accepted_count,
        COUNT(pa.id) FILTER (WHERE pa.status = 'completed') as completed_count
      FROM listings l
      LEFT JOIN project_applications pa ON pa.listing_id = l.id
      WHERE l.author_id = ${userId}
      GROUP BY l.id, l.title, l.status, l.published_at
      ORDER BY l.created_at DESC
    `;

    // Top requested skills (from their listings)
    const topSkills = await sql`
      SELECT
        s.name as skill,
        COUNT(DISTINCT l.id) as listing_count
      FROM listings l,
        LATERAL jsonb_array_elements_text(l.skills_required) AS skill_name
      JOIN skills s ON s.name = skill_name
      WHERE l.author_id = ${userId}
      GROUP BY s.name
      ORDER BY listing_count DESC
      LIMIT 10
    `;

    // All applications detail for export
    const allApplications = await sql`
      SELECT
        pa.id, pa.student_name, pa.student_email, pa.status,
        pa.listing_title, pa.submitted_at, pa.responded_at, pa.completed_at,
        pa.gpa, l.category, l.compensation
      FROM project_applications pa
      LEFT JOIN listings l ON l.id = pa.listing_id
      WHERE pa.corporate_id = ${userId}
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      ORDER BY pa.submitted_at DESC
    `;

    return NextResponse.json({
      summary: {
        activeListings: parseInt(listingStats[0].active as string),
        totalApplications: totalApps,
        avgTimeToFill: avgTimeToFill[0].avg_days ? parseFloat(avgTimeToFill[0].avg_days as string) : null,
        completionRate: acceptedApps > 0 ? Math.round((completedApps / acceptedApps) * 100) : 0,
        inviteAcceptRate: totalInvites > 0 ? Math.round((acceptedInvites / totalInvites) * 100) : 0,
        avgApplicantsPerListing: avgApplicants[0].avg ? parseFloat(avgApplicants[0].avg as string) : 0,
      },
      applicationFunnel: funnelData,
      applicationTimeline: timeline.map((r: Record<string, unknown>) => ({
        date: (r.date as Date).toISOString().split('T')[0],
        received: parseInt(r.received as string),
        accepted: parseInt(r.accepted as string),
      })),
      listingPerformance: listingPerf.map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        publishedAt: r.published_at,
        applicants: parseInt(r.applicants as string),
        accepted: parseInt(r.accepted_count as string),
        completed: parseInt(r.completed_count as string),
      })),
      topRequestedSkills: topSkills.map((r: Record<string, unknown>) => ({
        skill: r.skill,
        count: parseInt(r.listing_count as string),
      })),
      allApplications: allApplications.map((a: Record<string, unknown>) => ({
        id: a.id,
        studentName: a.student_name,
        studentEmail: a.student_email,
        status: a.status,
        listingTitle: a.listing_title,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
        completedAt: a.completed_at,
        gpa: a.gpa,
        category: a.category,
        compensation: a.compensation,
      })),
    });
  } catch (error) {
    console.error('Corporate analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
