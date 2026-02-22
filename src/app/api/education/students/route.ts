/**
 * GET /api/education/students — List students for educational admin
 *
 * Supports search, sort, and filter by major/graduation year/sport.
 * Includes sport data (from student_schedules+sport_seasons) and
 * readiness score (from skill_gap_snapshots).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

const VALID_SORT_KEYS = ['name', 'major', 'graduation_year', 'sport', 'readiness_score', 'created_at', 'gpa'] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const majorFilter = searchParams.get('major') || '';
    const gradYearFilter = searchParams.get('gradYear') || '';
    const sportFilter = searchParams.get('sport') || '';
    const limit = 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [
      `u.role = 'student'`,
      `u.tenant_id = '${tenantId}'`,
    ];

    if (q) {
      const escaped = q.replace(/'/g, "''");
      conditions.push(`(u.display_name ILIKE '%${escaped}%' OR u.email ILIKE '%${escaped}%' OR u.university ILIKE '%${escaped}%' OR u.major ILIKE '%${escaped}%')`);
    }
    if (majorFilter) {
      const escaped = majorFilter.replace(/'/g, "''");
      conditions.push(`u.major ILIKE '%${escaped}%'`);
    }
    if (gradYearFilter) {
      conditions.push(`u.graduation_year = ${parseInt(gradYearFilter)}`);
    }
    if (sportFilter) {
      const escaped = sportFilter.replace(/'/g, "''");
      conditions.push(`sport_name ILIKE '%${escaped}%'`);
    }

    // Build ORDER BY
    let orderExpr = 'u.created_at';
    if (sortBy === 'name') orderExpr = 'u.display_name';
    else if (sortBy === 'major') orderExpr = 'u.major';
    else if (sortBy === 'graduation_year') orderExpr = 'u.graduation_year';
    else if (sortBy === 'sport') orderExpr = 'sport_name';
    else if (sortBy === 'readiness_score') orderExpr = 'readiness_score';
    else if (sortBy === 'gpa') orderExpr = 'u.gpa';

    const nullsClause = sortDir === 'asc' ? 'NULLS LAST' : 'NULLS LAST';

    const query = `
      SELECT u.id, u.display_name, u.email, u.university, u.major, u.graduation_year,
             u.gpa, u.is_active, u.created_at, u.metadata,
             (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id) as application_count,
             (SELECT AVG(rating)::numeric(3,2) FROM student_ratings sr WHERE sr.student_id = u.id) as avg_private_rating,
             (SELECT COUNT(*) FROM student_ratings sr WHERE sr.student_id = u.id) as private_rating_count,
             sport_agg.sport_name,
             snap.overall_readiness_score as readiness_score
      FROM users u
      LEFT JOIN LATERAL (
        SELECT string_agg(DISTINCT ss.sport_name, ', ') as sport_name
        FROM student_schedules sch
        JOIN sport_seasons ss ON ss.id = sch.sport_season_id
        WHERE sch.user_id = u.id AND sch.is_active = TRUE
      ) sport_agg ON TRUE
      LEFT JOIN LATERAL (
        SELECT overall_readiness_score
        FROM skill_gap_snapshots sgs
        WHERE sgs.student_id = u.id
        ORDER BY sgs.snapshot_date DESC
        LIMIT 1
      ) snap ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderExpr} ${sortDir} ${nullsClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT string_agg(DISTINCT ss.sport_name, ', ') as sport_name
        FROM student_schedules sch
        JOIN sport_seasons ss ON ss.id = sch.sport_season_id
        WHERE sch.user_id = u.id AND sch.is_active = TRUE
      ) sport_agg ON TRUE
      WHERE ${conditions.join(' AND ')}
    `;

    const students = await sql.unsafe(query);
    const countResult = await sql.unsafe(countQuery);
    const total = parseInt(countResult[0].count as string);

    // Also fetch distinct values for filter dropdowns
    const majors = await sql`
      SELECT DISTINCT major FROM users
      WHERE role = 'student' AND tenant_id = ${tenantId} AND major IS NOT NULL AND major != ''
      ORDER BY major
    `;
    const gradYears = await sql`
      SELECT DISTINCT graduation_year FROM users
      WHERE role = 'student' AND tenant_id = ${tenantId} AND graduation_year IS NOT NULL
      ORDER BY graduation_year DESC
    `;
    const sports = await sql`
      SELECT DISTINCT ss.sport_name
      FROM student_schedules sch
      JOIN sport_seasons ss ON ss.id = sch.sport_season_id
      JOIN users u ON u.id = sch.user_id
      WHERE u.role = 'student' AND u.tenant_id = ${tenantId} AND sch.is_active = TRUE
      ORDER BY ss.sport_name
    `;

    return NextResponse.json({
      students: students.map((s: Record<string, unknown>) => {
        const metadata = (s.metadata || {}) as Record<string, unknown>;
        // Sport from schedules, fallback to metadata
        const sport = (s.sport_name as string) || (metadata.sportsPlayed as string) || null;

        return {
          id: s.id,
          name: s.display_name,
          email: s.email,
          university: s.university,
          major: s.major,
          graduationYear: s.graduation_year,
          gpa: s.gpa,
          isActive: s.is_active,
          createdAt: s.created_at,
          applicationCount: parseInt(s.application_count as string),
          avgPrivateRating: s.avg_private_rating ? Number(s.avg_private_rating) : null,
          privateRatingCount: parseInt(s.private_rating_count as string) || 0,
          sport,
          readinessScore: s.readiness_score ? Number(s.readiness_score) : null,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: {
        majors: majors.map((m: Record<string, unknown>) => m.major as string),
        gradYears: gradYears.map((g: Record<string, unknown>) => g.graduation_year as number),
        sports: sports.map((s: Record<string, unknown>) => s.sport_name as string),
      },
    });
  } catch (error) {
    console.error('Education students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
