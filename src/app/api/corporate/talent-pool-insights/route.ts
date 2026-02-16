/**
 * GET /api/corporate/talent-pool-insights — Aggregate student data for posting insights
 *
 * Returns top sports, universities, availability distribution, and top skills
 * to help corporate partners craft better project postings.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'corporate_partner' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Run all 5 queries in parallel
    const [totalResult, sportsResult, universityResult, availabilityResult, skillsResult] = await Promise.all([
      // Total active students
      sql`SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true`,

      // Top sports from metadata
      sql`
        SELECT sport, COUNT(*) as student_count
        FROM (
          SELECT TRIM(unnest(string_to_array(metadata->>'sportsPlayed', ','))) as sport
          FROM users
          WHERE role = 'student' AND is_active = true
            AND metadata->>'sportsPlayed' IS NOT NULL
            AND metadata->>'sportsPlayed' != ''
        ) parsed
        WHERE sport != ''
        GROUP BY sport
        ORDER BY student_count DESC
        LIMIT 15
      `,

      // Top universities
      sql`
        SELECT university, COUNT(*) as student_count
        FROM users
        WHERE role = 'student' AND is_active = true AND university IS NOT NULL AND university != ''
        GROUP BY university
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
