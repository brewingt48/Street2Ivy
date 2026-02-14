/**
 * GET /api/education/dashboard — Education admin dashboard stats
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const totalStudents = await sql`
      SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true
    `;

    const activeProjects = await sql`
      SELECT COUNT(*) as count FROM project_applications WHERE status = 'accepted'
    `;

    const completedProjects = await sql`
      SELECT COUNT(*) as count FROM project_applications WHERE status = 'completed'
    `;

    const waitlistCount = await sql`
      SELECT COUNT(*) as count FROM student_waitlist WHERE contacted = false
    `;

    const recentStudents = await sql`
      SELECT id, display_name, email, university, created_at
      FROM users WHERE role = 'student' AND is_active = true
      ORDER BY created_at DESC LIMIT 5
    `;

    return NextResponse.json({
      stats: {
        totalStudents: parseInt(totalStudents[0].count as string),
        activeProjects: parseInt(activeProjects[0].count as string),
        completedProjects: parseInt(completedProjects[0].count as string),
        waitlistCount: parseInt(waitlistCount[0].count as string),
      },
      recentStudents: recentStudents.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.display_name,
        email: s.email,
        university: s.university,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error('Education dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
