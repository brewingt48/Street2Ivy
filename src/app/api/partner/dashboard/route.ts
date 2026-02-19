/**
 * GET /api/partner/dashboard — Network partner dashboard stats
 *
 * Looks up the current user as a network_partner_user, then returns
 * listing count, application stats, and recent applications.
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Look up network_partner_user by email
    const partnerUsers = await sql`
      SELECT npu.id, npu.network_partner_id, npu.first_name, npu.last_name, npu.role,
             np.name AS partner_name, np.slug AS partner_slug
      FROM network_partner_users npu
      JOIN network_partners np ON np.id = npu.network_partner_id
      WHERE npu.email = ${session.data.email}
        AND npu.status = 'active'
      LIMIT 1
    `;

    if (partnerUsers.length === 0) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const partnerUser = partnerUsers[0];
    const partnerId = partnerUser.network_partner_id;

    // Listing stats
    const listingStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS active,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) AS total
      FROM network_listings
      WHERE network_partner_id = ${partnerId}
    `;

    // Application stats across all partner listings
    const appStats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE na.status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE na.status = 'accepted') AS accepted,
        COUNT(*) FILTER (WHERE na.status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE na.status = 'completed') AS completed_apps,
        COUNT(*) AS total
      FROM network_applications na
      JOIN network_listings nl ON nl.id = na.network_listing_id
      WHERE nl.network_partner_id = ${partnerId}
    `;

    // Recent applications
    const recentApps = await sql`
      SELECT
        na.id,
        na.status,
        na.match_score,
        na.created_at,
        na.network_listing_id,
        nl.title AS listing_title,
        u.first_name AS student_first_name,
        u.last_name AS student_last_name,
        u.email AS student_email,
        t.name AS tenant_name
      FROM network_applications na
      JOIN network_listings nl ON nl.id = na.network_listing_id
      JOIN users u ON u.id = na.student_user_id
      LEFT JOIN tenants t ON t.id = na.tenant_id
      WHERE nl.network_partner_id = ${partnerId}
      ORDER BY na.created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      partnerUser: {
        id: partnerUser.id,
        firstName: partnerUser.first_name,
        lastName: partnerUser.last_name,
        role: partnerUser.role,
        partnerName: partnerUser.partner_name,
        partnerSlug: partnerUser.partner_slug,
      },
      listings: {
        active: parseInt(listingStats[0].active as string),
        draft: parseInt(listingStats[0].draft as string),
        closed: parseInt(listingStats[0].closed as string),
        completed: parseInt(listingStats[0].completed as string),
        total: parseInt(listingStats[0].total as string),
      },
      applications: {
        pending: parseInt(appStats[0].pending as string),
        accepted: parseInt(appStats[0].accepted as string),
        rejected: parseInt(appStats[0].rejected as string),
        completed: parseInt(appStats[0].completed_apps as string),
        total: parseInt(appStats[0].total as string),
      },
      recentApplications: recentApps.map((a: Record<string, unknown>) => ({
        id: a.id,
        status: a.status,
        matchScore: a.match_score,
        createdAt: a.created_at,
        listingId: a.network_listing_id,
        listingTitle: a.listing_title,
        studentName: `${a.student_first_name} ${a.student_last_name}`,
        studentEmail: a.student_email,
        tenantName: a.tenant_name,
      })),
    });
  } catch (error) {
    console.error('Partner dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
