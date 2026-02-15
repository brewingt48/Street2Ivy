/**
 * GET /api/students/dashboard — Student dashboard stats and recent activity
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;

    // Get application stats
    const appStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM project_applications
      WHERE student_id = ${userId}
    `;

    // Get recent applications
    const recentApplications = await sql`
      SELECT id, listing_title, corporate_name, status, submitted_at, responded_at
      FROM project_applications
      WHERE student_id = ${userId}
      ORDER BY submitted_at DESC
      LIMIT 5
    `;

    // Get skill count
    const skillCount = await sql`
      SELECT COUNT(*) as count FROM user_skills WHERE user_id = ${userId}
    `;

    // Get profile completeness
    const profile = await sql`
      SELECT first_name, last_name, bio, university, major, graduation_year, gpa, avatar_url, email_verified
      FROM users WHERE id = ${userId}
    `;

    const u = profile[0];
    const profileFields = [
      u.first_name, u.last_name, u.bio, u.university,
      u.major, u.graduation_year, u.gpa, u.avatar_url
    ];
    const filledFields = profileFields.filter(Boolean).length;
    const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

    // Get available projects count
    const projectCount = await sql`
      SELECT COUNT(*) as count FROM listings WHERE status = 'published'
    `;

    // Get unread message count
    const unreadCount = await sql`
      SELECT COUNT(*) as count
      FROM direct_messages
      WHERE recipient_id = ${userId} AND read_at IS NULL
    `;

    return NextResponse.json({
      stats: {
        applications: {
          total: parseInt(appStats[0].total),
          pending: parseInt(appStats[0].pending),
          accepted: parseInt(appStats[0].accepted),
          rejected: parseInt(appStats[0].rejected),
          completed: parseInt(appStats[0].completed),
        },
        skills: parseInt(skillCount[0].count),
        profileCompleteness,
        emailVerified: u.email_verified,
        availableProjects: parseInt(projectCount[0].count),
        unreadMessages: parseInt(unreadCount[0].count),
      },
      recentApplications: recentApplications.map((a: Record<string, unknown>) => ({
        id: a.id,
        listingTitle: a.listing_title,
        corporateName: a.corporate_name,
        status: a.status,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
      })),
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
