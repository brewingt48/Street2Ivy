/**
 * GET /api/corporate/search-students — Search students for invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const skill = searchParams.get('skill') || '';
    const alumniOf = searchParams.get('alumniOf') || '';
    const sportsPlayed = searchParams.get('sportsPlayed') || '';
    const activities = searchParams.get('activities') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [
      sql`u.role = 'student'`,
      sql`u.is_active = true`,
    ];

    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(
        sql`(u.display_name ILIKE ${searchPattern} OR u.university ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})`
      );
    }

    if (skill) {
      const skillPattern = `%${skill}%`;
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id
          WHERE us.user_id = u.id AND s.name ILIKE ${skillPattern}
        )`
      );
    }

    if (alumniOf) {
      const alumniPattern = `%${alumniOf}%`;
      conditions.push(
        sql`u.metadata->>'alumniOf' ILIKE ${alumniPattern}`
      );
    }

    if (sportsPlayed) {
      const sportsPattern = `%${sportsPlayed}%`;
      conditions.push(
        sql`u.metadata->>'sportsPlayed' ILIKE ${sportsPattern}`
      );
    }

    if (activities) {
      const activitiesPattern = `%${activities}%`;
      conditions.push(
        sql`u.metadata->>'activities' ILIKE ${activitiesPattern}`
      );
    }

    const whereClause = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`
    );

    const students = await sql`
      SELECT u.id, u.display_name, u.email, u.university, u.major,
             u.graduation_year, u.gpa, u.bio, u.metadata,
             COALESCE(
               (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
               ARRAY[]::text[]
             ) as skills
      FROM users u
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as count FROM users u
      WHERE ${whereClause}
    `;
    const total = parseInt(countResult[0].count as string);

    return NextResponse.json({
      students: students.map((s: Record<string, unknown>) => {
        const metadata = (s.metadata || {}) as Record<string, unknown>;
        return {
          id: s.id,
          name: s.display_name,
          email: s.email,
          university: s.university,
          major: s.major,
          graduationYear: s.graduation_year,
          gpa: s.gpa,
          bio: s.bio,
          hoursPerWeek: null,
          location: null,
          openToWork: false,
          skills: s.skills || [],
          alumniOf: (metadata.alumniOf as string) || null,
          sportsPlayed: (metadata.sportsPlayed as string) || null,
          activities: (metadata.activities as string) || null,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Search students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
