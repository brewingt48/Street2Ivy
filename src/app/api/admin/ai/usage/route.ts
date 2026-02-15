/**
 * GET /api/admin/ai/usage — AI usage analytics across all tenants
 *
 * Returns per-tenant usage for the current month, monthly trends,
 * and tenants approaching their usage limits.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { AI_TIER_CONFIGS } from '@/lib/ai/config';

/** Get current month key in YYYY-MM format */
function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Resolve the usage limit for a given plan tier */
function getLimitForPlan(plan: string): number {
  const config = AI_TIER_CONFIGS[plan] || AI_TIER_CONFIGS.starter;
  return config.maxMonthlyUses;
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const monthKey = getMonthKey();

    // Per-tenant usage for the current month joined with tenant info
    const tenantUsageRows = await sql`
      SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.features,
        COALESCE(u.usage_count, 0)::int AS used
      FROM tenants t
      LEFT JOIN ai_usage_counters u
        ON u.tenant_id = t.id AND u.month_key = ${monthKey}
      WHERE t.status = 'active'
      ORDER BY COALESCE(u.usage_count, 0) DESC
    `;

    const tenantUsage = tenantUsageRows.map((row: Record<string, unknown>) => {
      const features = (row.features || {}) as Record<string, unknown>;
      const plan = (features.plan as string) || 'starter';
      const aiConfigOverride = features.aiConfig as Record<string, unknown> | undefined;
      const limit = aiConfigOverride?.maxMonthlyUses != null
        ? Number(aiConfigOverride.maxMonthlyUses)
        : getLimitForPlan(plan);
      const model = aiConfigOverride?.model
        ? String(aiConfigOverride.model)
        : (AI_TIER_CONFIGS[plan] || AI_TIER_CONFIGS.starter).model;
      const used = Number(row.used);

      return {
        tenantId: row.tenant_id as string,
        tenantName: row.tenant_name as string,
        plan,
        used,
        limit,
        model,
      };
    });

    const totalUsage = tenantUsage.reduce((sum: number, t: { used: number }) => sum + t.used, 0);

    // Tenants at or above 80% of their limit (skip unlimited)
    const approachingLimit = tenantUsage.filter(
      (t: { used: number; limit: number }) =>
        t.limit > 0 && t.used >= t.limit * 0.8
    );

    // Monthly trend: last 6 months aggregated
    const monthlyTrendRows = await sql`
      SELECT
        month_key,
        SUM(usage_count)::int AS total
      FROM ai_usage_counters
      WHERE month_key >= to_char(NOW() - INTERVAL '5 months', 'YYYY-MM')
      GROUP BY month_key
      ORDER BY month_key ASC
    `;

    const monthlyTrend = monthlyTrendRows.map((row: Record<string, unknown>) => ({
      month: row.month_key as string,
      total: Number(row.total),
    }));

    return NextResponse.json({
      totalUsage,
      tenantUsage,
      monthlyTrend,
      approachingLimit,
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
