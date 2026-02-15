/**
 * GET /api/education/analytics — Education admin analytics and reporting
 *
 * Query params: range (7d|30d|90d|12mo|all)
 * Returns enrollment, placement rates, GPA, skills, student performance.
 * Scoped to tenant's students.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getDateRange, getTimelineInterval, type RangeKey } from '@/lib/analytics/date-ranges';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const range = (request.nextUrl.searchParams.get('range') || '30d') as RangeKey;
    const { start, end } = getDateRange(range);
    const interval = getTimelineInterval(range);
    const tenantId = session.data.tenantId;

    // Total students
    const studentCount = await sql`
      SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true AND tenant_id = ${tenantId}
    `;
    const totalStudents = parseInt(studentCount[0].count as string);

    // Average GPA
    const avgGpaResult = await sql`
      SELECT ROUND(AVG(gpa::numeric), 2) as avg_gpa
      FROM users WHERE role = 'student' AND is_active = true AND tenant_id = ${tenantId} AND gpa IS NOT NULL
    `;

    // Application stats for students
    const appStats = await sql`
      SELECT
        COUNT(DISTINCT pa.student_id) as students_with_apps,
        COUNT(DISTINCT pa.student_id) FILTER (WHERE pa.status = 'accepted') as students_placed,
        COUNT(*) as total_apps,
        COUNT(*) FILTER (WHERE pa.status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE pa.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE pa.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE pa.status = 'rejected') as rejected
      FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE u.role = 'student' AND u.is_active = true AND u.tenant_id = ${tenantId}
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
    `;
    const studentsPlaced = parseInt(appStats[0].students_placed as string);

    // Waitlist
    const waitlistCount = await sql`
      SELECT COUNT(*) as count FROM student_waitlist WHERE contacted = false
    `;

    // Enrollment timeline
    const enrollmentTimeline = interval === 'day'
      ? await sql`
          SELECT DATE_TRUNC('day', created_at)::date as date,
            COUNT(*) as new_students
          FROM users
          WHERE role = 'student' AND is_active = true AND tenant_id = ${tenantId}
            AND created_at >= ${start}::timestamp AND created_at <= ${end}::timestamp + interval '1 day'
          GROUP BY DATE_TRUNC('day', created_at)::date ORDER BY date`
      : interval === 'week'
      ? await sql`
          SELECT DATE_TRUNC('week', created_at)::date as date,
            COUNT(*) as new_students
          FROM users
          WHERE role = 'student' AND is_active = true AND tenant_id = ${tenantId}
            AND created_at >= ${start}::timestamp AND created_at <= ${end}::timestamp + interval '1 day'
          GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY date`
      : await sql`
          SELECT DATE_TRUNC('month', created_at)::date as date,
            COUNT(*) as new_students
          FROM users
          WHERE role = 'student' AND is_active = true AND tenant_id = ${tenantId}
            AND created_at >= ${start}::timestamp AND created_at <= ${end}::timestamp + interval '1 day'
          GROUP BY DATE_TRUNC('month', created_at)::date ORDER BY date`;

    // Applications by status
    const statusBreakdown = await sql`
      SELECT pa.status, COUNT(*) as count
      FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE u.role = 'student' AND u.is_active = true AND u.tenant_id = ${tenantId}
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      GROUP BY pa.status
      ORDER BY count DESC
    `;

    // Top skills among students
    const topSkills = await sql`
      SELECT s.name as skill, COUNT(DISTINCT us.user_id) as student_count
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN users u ON u.id = us.user_id
      WHERE u.role = 'student' AND u.is_active = true AND u.tenant_id = ${tenantId}
      GROUP BY s.name
      ORDER BY student_count DESC
      LIMIT 10
    `;

    // Student performance (per-student metrics)
    const studentPerformance = await sql`
      SELECT
        u.id, u.display_name as name, u.email, u.university, u.gpa,
        COUNT(pa.id) as applications,
        COUNT(pa.id) FILTER (WHERE pa.status = 'accepted') as accepted,
        COUNT(pa.id) FILTER (WHERE pa.status = 'completed') as completed
      FROM users u
      LEFT JOIN project_applications pa ON pa.student_id = u.id
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      WHERE u.role = 'student' AND u.is_active = true AND u.tenant_id = ${tenantId}
      GROUP BY u.id, u.display_name, u.email, u.university, u.gpa
      ORDER BY applications DESC
      LIMIT 100
    `;

    // Corporate partner activity
    const corpActivity = await sql`
      SELECT
        u.display_name as name,
        COUNT(DISTINCT l.id) as listings,
        COUNT(DISTINCT pa.student_id) FILTER (WHERE pa.status = 'accepted') as students_hired
      FROM users u
      LEFT JOIN listings l ON l.author_id = u.id
      LEFT JOIN project_applications pa ON pa.corporate_id = u.id
        AND pa.submitted_at >= ${start}::timestamp
        AND pa.submitted_at <= ${end}::timestamp + interval '1 day'
      WHERE u.role = 'corporate_partner' AND u.is_active = true AND u.tenant_id = ${tenantId}
      GROUP BY u.display_name
      HAVING COUNT(DISTINCT l.id) > 0
      ORDER BY students_hired DESC
      LIMIT 20
    `;

    return NextResponse.json({
      summary: {
        totalStudents,
        placementRate: totalStudents > 0 ? Math.round((studentsPlaced / totalStudents) * 100) : 0,
        avgGPA: avgGpaResult[0].avg_gpa ? parseFloat(avgGpaResult[0].avg_gpa as string) : null,
        activeProjects: parseInt(appStats[0].accepted as string),
        completedProjects: parseInt(appStats[0].completed as string),
        waitlistPending: parseInt(waitlistCount[0].count as string),
      },
      enrollmentTimeline: enrollmentTimeline.map((r: Record<string, unknown>) => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
        newStudents: parseInt(r.new_students as string),
      })),
      applicationsByStatus: statusBreakdown.map((r: Record<string, unknown>) => ({
        status: r.status as string,
        count: parseInt(r.count as string),
      })),
      topSkills: topSkills.map((r: Record<string, unknown>) => ({
        skill: r.skill as string,
        studentCount: parseInt(r.student_count as string),
      })),
      studentPerformance: studentPerformance.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        university: r.university,
        gpa: r.gpa,
        applications: parseInt(r.applications as string),
        accepted: parseInt(r.accepted as string),
        completed: parseInt(r.completed as string),
      })),
      corporatePartnerActivity: corpActivity.map((r: Record<string, unknown>) => ({
        name: r.name,
        listings: parseInt(r.listings as string),
        studentsHired: parseInt(r.students_hired as string),
      })),
    });
  } catch (error) {
    console.error('Education analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
