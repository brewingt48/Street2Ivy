/**
 * GET /api/corporate/students/:id — View a student's profile (for corporate partners)
 *
 * Returns public-facing profile data, skills, schedule availability,
 * past project history, and tenant/network membership info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Only corporate partners can view student profiles' }, { status: 403 });
    }

    const studentId = params.id;

    // Fetch student + tenant info
    const students = await sql`
      SELECT u.id, u.display_name, u.first_name, u.last_name,
             u.university, u.major, u.graduation_year, u.gpa,
             u.bio, u.avatar_url, u.metadata, u.public_data,
             u.tenant_id, u.created_at,
             t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = ${studentId} AND u.role = 'student' AND u.is_active = true
    `;

    if (students.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const s = students[0];
    const metadata = (s.metadata || {}) as Record<string, unknown>;
    const publicData = (s.public_data || {}) as Record<string, unknown>;

    // Skills
    const skills = await sql`
      SELECT s.name, s.category
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${studentId}
      ORDER BY s.name
    `;

    // Availability from student_schedules
    const schedules = await sql`
      SELECT available_hours_per_week
      FROM student_schedules
      WHERE user_id = ${studentId} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Completed projects count
    const projectStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE pa.status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE pa.status = 'accepted') as active_count
      FROM project_applications pa
      WHERE pa.student_id = ${studentId}
    `;

    // Corporate ratings for this student
    const ratings = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rating_count
      FROM corporate_ratings
      WHERE student_id = ${studentId}
    `;

    // Check if corporate partner has already invited this student
    const existingInvites = await sql`
      SELECT id, status, sent_at
      FROM corporate_invites
      WHERE corporate_partner_id = ${session.data.userId}
        AND student_id = ${studentId}
      ORDER BY sent_at DESC
      LIMIT 1
    `;

    return NextResponse.json({
      student: {
        id: s.id,
        name: s.display_name,
        firstName: s.first_name,
        lastName: s.last_name,
        university: s.university,
        major: s.major,
        graduationYear: s.graduation_year,
        gpa: s.gpa,
        bio: s.bio,
        avatarUrl: s.avatar_url,
        tenantId: s.tenant_id,
        tenantName: s.tenant_name || null,
        sportsPlayed: (metadata.sportsPlayed as string) || null,
        activities: (metadata.activities as string) || null,
        alumniOf: (metadata.alumniOf as string) || null,
        hoursPerWeek: schedules.length > 0 ? schedules[0].available_hours_per_week : null,
        openToWork: (publicData.openToWork as boolean) || false,
        location: (publicData.location as string) || null,
        completedProjects: parseInt(projectStats[0].completed_count as string) || 0,
        activeProjects: parseInt(projectStats[0].active_count as string) || 0,
        avgRating: ratings[0]?.avg_rating ? Number(ratings[0].avg_rating) : null,
        ratingCount: ratings[0]?.rating_count ? Number(ratings[0].rating_count) : 0,
        memberSince: s.created_at,
      },
      skills: skills.map((sk: Record<string, unknown>) => ({
        name: sk.name as string,
        category: sk.category as string,
      })),
      existingInvite: existingInvites.length > 0 ? {
        id: existingInvites[0].id,
        status: existingInvites[0].status,
        sentAt: existingInvites[0].sent_at,
      } : null,
    });
  } catch (error) {
    console.error('Student profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
