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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let students;
    let total;

    if (q && skill) {
      const searchPattern = `%${q}%`;
      const skillPattern = `%${skill}%`;
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major,
               u.graduation_year, u.gpa, u.bio, u.hours_per_week, u.location,
               u.open_to_work,
               COALESCE(
                 (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
                 ARRAY[]::text[]
               ) as skills
        FROM users u
        WHERE u.role = 'student'
          AND u.is_active = true
          AND (u.display_name ILIKE ${searchPattern} OR u.university ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})
          AND EXISTS (
            SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = u.id AND s.name ILIKE ${skillPattern}
          )
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users u
        WHERE u.role = 'student' AND u.is_active = true
          AND (u.display_name ILIKE ${searchPattern} OR u.university ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})
          AND EXISTS (
            SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = u.id AND s.name ILIKE ${skillPattern}
          )
      `;
      total = parseInt(countResult[0].count as string);
    } else if (q) {
      const searchPattern = `%${q}%`;
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major,
               u.graduation_year, u.gpa, u.bio, u.hours_per_week, u.location,
               u.open_to_work,
               COALESCE(
                 (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
                 ARRAY[]::text[]
               ) as skills
        FROM users u
        WHERE u.role = 'student'
          AND u.is_active = true
          AND (u.display_name ILIKE ${searchPattern} OR u.university ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users u
        WHERE u.role = 'student' AND u.is_active = true
          AND (u.display_name ILIKE ${searchPattern} OR u.university ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})
      `;
      total = parseInt(countResult[0].count as string);
    } else if (skill) {
      const skillPattern = `%${skill}%`;
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major,
               u.graduation_year, u.gpa, u.bio, u.hours_per_week, u.location,
               u.open_to_work,
               COALESCE(
                 (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
                 ARRAY[]::text[]
               ) as skills
        FROM users u
        WHERE u.role = 'student'
          AND u.is_active = true
          AND EXISTS (
            SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = u.id AND s.name ILIKE ${skillPattern}
          )
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users u
        WHERE u.role = 'student' AND u.is_active = true
          AND EXISTS (
            SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = u.id AND s.name ILIKE ${skillPattern}
          )
      `;
      total = parseInt(countResult[0].count as string);
    } else {
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major,
               u.graduation_year, u.gpa, u.bio, u.hours_per_week, u.location,
               u.open_to_work,
               COALESCE(
                 (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
                 ARRAY[]::text[]
               ) as skills
        FROM users u
        WHERE u.role = 'student'
          AND u.is_active = true
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users u
        WHERE u.role = 'student' AND u.is_active = true
      `;
      total = parseInt(countResult[0].count as string);
    }

    return NextResponse.json({
      students: students.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.display_name,
        email: s.email,
        university: s.university,
        major: s.major,
        graduationYear: s.graduation_year,
        gpa: s.gpa,
        bio: s.bio,
        hoursPerWeek: s.hours_per_week,
        location: s.location,
        openToWork: s.open_to_work,
        skills: s.skills || [],
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Search students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
