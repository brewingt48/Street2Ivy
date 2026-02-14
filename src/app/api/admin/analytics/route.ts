/**
 * GET /api/admin/analytics — Platform admin analytics and reporting
 *
 * Query params: range (7d|30d|90d|12mo|all)
 * Returns user growth, application volume, tenant health, role breakdown, category breakdown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getDateRange, getTimelineInterval, type RangeKey } from '@/lib/analytics/date-ranges';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const range = (request.nextUrl.searchParams.get('range') || '30d') as RangeKey;
    const { start, end } = getDateRange(range);
    const interval = getTimelineInterval(range);

    // Total users
    const totalUsersResult = await sql`
      SELECT COUNT(*) as count FROM users WHERE is_active = true
    `;
    const totalUsers = parseInt(totalUsersResult[0].count as string);

    // New users in period
    const newUsersResult = await sql`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= ${start}::timestamp
        AND created_at <= ${end}::timestamp + interval '1 day'
    `;

    // Active tenants
    const tenantCount = await sql`
      SELECT COUNT(*) as count FROM tenants WHERE status = 'active'
    `;

    // Total listings
    const listingCount = await sql`
      SELECT COUNT(*) as count FROM listings
    `;

    // Application stats
    const appStats = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM project_applications
      WHERE submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
    `;
    const totalApps = parseInt(appStats[0].total as string);
    const completedApps = parseInt(appStats[0].completed as string);

    // User growth timeline
    const userGrowth = await sql`
      SELECT
        DATE_TRUNC(${interval}, created_at)::date as date,
        COUNT(*) FILTER (WHERE role = 'student') as students,
        COUNT(*) FILTER (WHERE role = 'corporate_partner') as corporates,
        COUNT(*) FILTER (WHERE role = 'educational_admin') as edu_admins
      FROM users
      WHERE created_at >= ${start}::timestamp
        AND created_at <= ${end}::timestamp + interval '1 day'
      GROUP BY DATE_TRUNC(${interval}, created_at)
      ORDER BY date
    `;

    // Application volume timeline
    const appVolume = await sql`
      SELECT
        DATE_TRUNC(${interval}, submitted_at)::date as date,
        COUNT(*) as submitted,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM project_applications
      WHERE submitted_at >= ${start}::timestamp
        AND submitted_at <= ${end}::timestamp + interval '1 day'
      GROUP BY DATE_TRUNC(${interval}, submitted_at)
      ORDER BY date
    `;

    // Users by role
    const usersByRole = await sql`
      SELECT role, COUNT(*) as count
      FROM users WHERE is_active = true
      GROUP BY role
      ORDER BY count DESC
    `;

    // Listings by category
    const listingsByCategory = await sql`
      SELECT COALESCE(category, 'Uncategorized') as category, COUNT(*) as count
      FROM listings
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `;

    // Tenant health
    const tenantHealth = await sql`
      SELECT
        t.id, t.name,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') as students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'corporate_partner') as corporates,
        COUNT(DISTINCT l.id) as listings,
        COUNT(DISTINCT pa.id) as applications,
        MAX(GREATEST(
          COALESCE(u.last_login_at, u.created_at),
          COALESCE(l.created_at, '2000-01-01'),
          COALESCE(pa.submitted_at, '2000-01-01')
        )) as last_activity
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
      LEFT JOIN listings l ON l.tenant_id = t.id
      LEFT JOIN project_applications pa ON pa.listing_id = l.id
      WHERE t.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY students DESC
    `;

    // Top institutions
    const topInstitutions = await sql`
      SELECT
        COALESCE(u.university, 'Unknown') as name,
        COUNT(DISTINCT u.id) as students,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status IN ('accepted', 'completed')) as placements
      FROM users u
      LEFT JOIN project_applications pa ON pa.student_id = u.id
      WHERE u.role = 'student' AND u.is_active = true AND u.university IS NOT NULL
      GROUP BY u.university
      ORDER BY students DESC
      LIMIT 15
    `;

    return NextResponse.json({
      summary: {
        totalUsers,
        newUsersThisPeriod: parseInt(newUsersResult[0].count as string),
        activeTenants: parseInt(tenantCount[0].count as string),
        totalListings: parseInt(listingCount[0].count as string),
        totalApplications: totalApps,
        platformCompletionRate: totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0,
      },
      userGrowth: userGrowth.map((r: Record<string, unknown>) => ({
        date: (r.date as Date).toISOString().split('T')[0],
        students: parseInt(r.students as string),
        corporates: parseInt(r.corporates as string),
        eduAdmins: parseInt(r.edu_admins as string),
      })),
      applicationVolume: appVolume.map((r: Record<string, unknown>) => ({
        date: (r.date as Date).toISOString().split('T')[0],
        submitted: parseInt(r.submitted as string),
        accepted: parseInt(r.accepted as string),
        completed: parseInt(r.completed as string),
      })),
      usersByRole: usersByRole.map((r: Record<string, unknown>) => ({
        role: (r.role as string).replace('_', ' '),
        count: parseInt(r.count as string),
      })),
      listingsByCategory: listingsByCategory.map((r: Record<string, unknown>) => ({
        category: r.category as string,
        count: parseInt(r.count as string),
      })),
      tenantHealth: tenantHealth.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        students: parseInt(r.students as string),
        corporates: parseInt(r.corporates as string),
        listings: parseInt(r.listings as string),
        applications: parseInt(r.applications as string),
        lastActivity: r.last_activity,
      })),
      topInstitutions: topInstitutions.map((r: Record<string, unknown>) => ({
        name: r.name,
        students: parseInt(r.students as string),
        placements: parseInt(r.placements as string),
      })),
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
