/**
 * GET /api/admin/dashboard — Platform admin dashboard stats
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userCounts = await sql`
      SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role
    `;

    const tenantCount = await sql`
      SELECT COUNT(*) as count FROM tenants WHERE status = 'active'
    `;

    const listingCount = await sql`
      SELECT status, COUNT(*) as count FROM listings GROUP BY status
    `;

    const appCount = await sql`
      SELECT status, COUNT(*) as count FROM project_applications GROUP BY status
    `;

    const waitlistCount = await sql`
      SELECT COUNT(*) as count FROM student_waitlist WHERE contacted = false
    `;

    const eduAppCount = await sql`
      SELECT status, COUNT(*) as count FROM edu_admin_applications GROUP BY status
    `;

    const recentUsers = await sql`
      SELECT id, display_name, email, role, created_at
      FROM users ORDER BY created_at DESC LIMIT 5
    `;

    return NextResponse.json({
      users: Object.fromEntries(
        userCounts.map((r: Record<string, unknown>) => [r.role as string, parseInt(r.count as string)])
      ),
      totalUsers: userCounts.reduce((s: number, r: Record<string, unknown>) => s + parseInt(r.count as string), 0),
      activeTenants: parseInt(tenantCount[0].count as string),
      listings: Object.fromEntries(
        listingCount.map((r: Record<string, unknown>) => [r.status as string, parseInt(r.count as string)])
      ),
      applications: Object.fromEntries(
        appCount.map((r: Record<string, unknown>) => [r.status as string, parseInt(r.count as string)])
      ),
      waitlist: parseInt(waitlistCount[0].count as string),
      eduApplications: Object.fromEntries(
        eduAppCount.map((r: Record<string, unknown>) => [r.status as string, parseInt(r.count as string)])
      ),
      recentUsers: recentUsers.map((u: Record<string, unknown>) => ({
        id: u.id,
        name: u.display_name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
