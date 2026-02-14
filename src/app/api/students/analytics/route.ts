/**
 * GET /api/students/analytics — Student analytics and reporting data
 *
 * Query params: range (7d|30d|90d|12mo|all)
 * Returns summary stats, application timeline, status breakdown, top skills, and full activity list.
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

    // Summary stats for the selected period
    const summaryResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        ROUND(AVG(
          CASE WHEN responded_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (responded_at - submitted_at)) / 86400
          END
        )::numeric, 1) as avg_response_days
      FROM project_applications
      WHERE student_id = ${userId}
        AND submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
    `;

    const summary = summaryResult[0];
    const total = parseInt(summary.total as string);
    const accepted = parseInt(summary.accepted as string);

    // Profile completeness & skills
    const profile = await sql`
      SELECT first_name, last_name, bio, university, major, graduation_year, gpa, avatar_url
      FROM users WHERE id = ${userId}
    `;
    const u = profile[0];
    const profileFields = [u.first_name, u.last_name, u.bio, u.university, u.major, u.graduation_year, u.gpa, u.avatar_url];
    const filledFields = profileFields.filter(Boolean).length;
    const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

    const skillCount = await sql`
      SELECT COUNT(*) as count FROM user_skills WHERE user_id = ${userId}
    `;

    // Applications by status (for pie chart)
    const statusBreakdown = await sql`
      SELECT status, COUNT(*) as count
      FROM project_applications
      WHERE student_id = ${userId}
        AND submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
      GROUP BY status
      ORDER BY count DESC
    `;

    // Application timeline (for line chart)
    const timeline = await sql`
      SELECT
        DATE_TRUNC(${interval}, submitted_at)::date as date,
        COUNT(*) as submitted,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted
      FROM project_applications
      WHERE student_id = ${userId}
        AND submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
      GROUP BY DATE_TRUNC(${interval}, submitted_at)
      ORDER BY date
    `;

    // Top skill matches (skills the student has that matched listings)
    const topSkills = await sql`
      SELECT s.name as skill, COUNT(DISTINCT pa.id) as match_count
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN project_applications pa ON pa.student_id = us.user_id
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      WHERE us.user_id = ${userId}
      GROUP BY s.name
      ORDER BY match_count DESC
      LIMIT 10
    `;

    // Full activity list (all applications in range)
    const allApplications = await sql`
      SELECT
        pa.id, pa.listing_title, pa.corporate_name, pa.status,
        pa.submitted_at, pa.responded_at, pa.completed_at,
        pa.gpa, l.category, l.compensation
      FROM project_applications pa
      LEFT JOIN listings l ON l.id = pa.listing_id
      WHERE pa.student_id = ${userId}
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      ORDER BY pa.submitted_at DESC
    `;

    return NextResponse.json({
      summary: {
        totalApplications: total,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
        avgResponseTime: summary.avg_response_days ? parseFloat(summary.avg_response_days as string) : null,
        completedProjects: parseInt(summary.completed as string),
        pendingApplications: parseInt(summary.pending as string),
        profileCompleteness,
        skillCount: parseInt(skillCount[0].count as string),
      },
      applicationsByStatus: statusBreakdown.map((r: Record<string, unknown>) => ({
        status: r.status as string,
        count: parseInt(r.count as string),
      })),
      applicationTimeline: timeline.map((r: Record<string, unknown>) => ({
        date: (r.date as Date).toISOString().split('T')[0],
        submitted: parseInt(r.submitted as string),
        accepted: parseInt(r.accepted as string),
      })),
      topSkillMatches: topSkills.map((r: Record<string, unknown>) => ({
        skill: r.skill as string,
        matchCount: parseInt(r.match_count as string),
      })),
      allApplications: allApplications.map((a: Record<string, unknown>) => ({
        id: a.id,
        listingTitle: a.listing_title,
        corporateName: a.corporate_name,
        status: a.status,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
        completedAt: a.completed_at,
        category: a.category,
        compensation: a.compensation,
      })),
    });
  } catch (error) {
    console.error('Student analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
