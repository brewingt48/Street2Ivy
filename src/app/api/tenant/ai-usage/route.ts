/**
 * GET /api/tenant/ai-usage — Get aggregate AI usage for the current tenant this month
 *
 * Returns usage counters grouped by feature for the tenant.
 * Requires educational_admin role.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Aggregate usage by feature for this month
    const usageRows = await sql`
      SELECT
        feature,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${monthStart}
      GROUP BY feature
      ORDER BY count DESC
    `;

    // Total usage
    const [totalRow] = await sql`
      SELECT COUNT(*) as total
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${monthStart}
    `;

    // Daily trend for the last 7 days
    const dailyRows = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    return NextResponse.json({
      byFeature: usageRows.map((row) => ({
        feature: row.feature,
        count: Number(row.count),
        uniqueUsers: Number(row.unique_users),
      })),
      totalThisMonth: Number(totalRow?.total || 0),
      dailyTrend: dailyRows.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
    });
  } catch (error) {
    console.error('Tenant AI usage GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
