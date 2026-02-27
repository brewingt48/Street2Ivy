/**
 * GET /api/corporate/talent-pool-insights — Aggregate student data for posting insights
 *
 * Returns top sports, universities, availability distribution, and top skills
 * to help corporate partners craft better project postings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'corporate_partner' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'tenant';
    const tenantId = session.data.tenantId;

    // Tenant filter: only applied when scope=tenant and user has a tenant
    const tenantFilter = scope === 'tenant' && tenantId
      ? sql`AND u.tenant_id = ${tenantId}`
      : sql``;

    // Run all 5 queries in parallel
    const [totalResult, sportsResult, universityResult, availabilityResult, skillsResult] = await Promise.all([
      // Total active students
      sql`SELECT COUNT(*) as count FROM users u WHERE u.role = 'student' AND u.is_active = true ${tenantFilter}`,

      // Top sports from metadata
      sql`
        SELECT sport, COUNT(*) as student_count
        FROM (
          SELECT TRIM(unnest(string_to_array(u.metadata->>'sportsPlayed', ','))) as sport
          FROM users u
          WHERE u.role = 'student' AND u.is_active = true
            AND u.metadata->>'sportsPlayed' IS NOT NULL
            AND u.metadata->>'sportsPlayed' != ''
            ${tenantFilter}
        ) parsed
        WHERE sport != ''
        GROUP BY sport
        ORDER BY student_count DESC
        LIMIT 15
      `,

      // Top universities
      sql`
        SELECT u.university, COUNT(*) as student_count
        FROM users u
        WHERE u.role = 'student' AND u.is_active = true AND u.university IS NOT NULL AND u.university != ''
          ${tenantFilter}
        GROUP BY u.university
        ORDER BY student_count DESC
        LIMIT 15
      `,

      // Availability distribution from student_schedules
      sql`
        SELECT
          CASE
            WHEN ss.available_hours_per_week <= 10 THEN '1-10'
            WHEN ss.available_hours_per_week <= 20 THEN '11-20'
            WHEN ss.available_hours_per_week <= 30 THEN '21-30'
            ELSE '31+'
          END as bucket,
          COUNT(DISTINCT ss.user_id) as student_count
        FROM student_schedules ss
        JOIN users u ON u.id = ss.user_id
        WHERE u.role = 'student' AND u.is_active = true
          AND ss.is_active = true
          AND ss.available_hours_per_week IS NOT NULL
          ${tenantFilter}
        GROUP BY bucket
        ORDER BY bucket
      `,

      // Top skills
      sql`
        SELECT s.name as skill, COUNT(DISTINCT us.user_id) as student_count
        FROM user_skills us
        JOIN skills s ON s.id = us.skill_id
        JOIN users u ON u.id = us.user_id
        WHERE u.role = 'student' AND u.is_active = true
          ${tenantFilter}
        GROUP BY s.name
        ORDER BY student_count DESC
        LIMIT 20
      `,
    ]);

    return NextResponse.json({
      totalStudents: parseInt(totalResult[0].count as string),
      topSports: sportsResult.map((r: Record<string, unknown>) => ({
        sport: r.sport as string,
        studentCount: parseInt(r.student_count as string),
      })),
      topUniversities: universityResult.map((r: Record<string, unknown>) => ({
        university: r.university as string,
        studentCount: parseInt(r.student_count as string),
      })),
      availabilityDistribution: availabilityResult.map((r: Record<string, unknown>) => ({
        bucket: r.bucket as string,
        studentCount: parseInt(r.student_count as string),
      })),
      topSkills: skillsResult.map((r: Record<string, unknown>) => ({
        skill: r.skill as string,
        studentCount: parseInt(r.student_count as string),
      })),
    });
  } catch (error) {
    console.error('Talent pool insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
