/**
 * GET /api/corporate/dashboard — Corporate partner dashboard stats
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

    // Listing stats
    const listingStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published') as active,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) as total
      FROM listings
      WHERE author_id = ${userId}
    `;

    // Application stats across all listings
    const appStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE pa.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE pa.status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE pa.status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE pa.status = 'completed') as completed,
        COUNT(*) as total
      FROM project_applications pa
      WHERE pa.corporate_id = ${userId}
    `;

    // Recent applications
    const recentApps = await sql`
      SELECT
        pa.id, pa.student_name, pa.student_email, pa.status,
        pa.listing_title, pa.listing_id, pa.submitted_at,
        pa.skills, pa.gpa
      FROM project_applications pa
      WHERE pa.corporate_id = ${userId}
      ORDER BY pa.submitted_at DESC
      LIMIT 5
    `;

    // Active invites
    const inviteStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'declined') as declined,
        COUNT(*) as total
      FROM corporate_invites
      WHERE corporate_partner_id = ${userId}
    `;

    // Unread messages
    const unread = await sql`
      SELECT COUNT(*) as count
      FROM application_messages am
      JOIN project_applications pa ON pa.id = am.application_id
      WHERE pa.corporate_id = ${userId}
        AND am.sender_id != ${userId}
        AND am.read_at IS NULL
    `;

    return NextResponse.json({
      listings: {
        active: parseInt(listingStats[0].active as string),
        draft: parseInt(listingStats[0].draft as string),
        closed: parseInt(listingStats[0].closed as string),
        total: parseInt(listingStats[0].total as string),
      },
      applications: {
        pending: parseInt(appStats[0].pending as string),
        accepted: parseInt(appStats[0].accepted as string),
        rejected: parseInt(appStats[0].rejected as string),
        completed: parseInt(appStats[0].completed as string),
        total: parseInt(appStats[0].total as string),
      },
      invites: {
        pending: parseInt(inviteStats[0].pending as string),
        accepted: parseInt(inviteStats[0].accepted as string),
        declined: parseInt(inviteStats[0].declined as string),
        total: parseInt(inviteStats[0].total as string),
      },
      unreadMessages: parseInt(unread[0].count as string),
      recentApplications: recentApps.map((a: Record<string, unknown>) => ({
        id: a.id,
        studentName: a.student_name,
        studentEmail: a.student_email,
        status: a.status,
        listingTitle: a.listing_title,
        listingId: a.listing_id,
        submittedAt: a.submitted_at,
        skills: a.skills,
        gpa: a.gpa,
      })),
    });
  } catch (error) {
    console.error('Corporate dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
