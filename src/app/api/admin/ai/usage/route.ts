/**
 * GET /api/admin/ai/usage — AI usage analytics across all tenants
 *
 * Returns per-tenant usage for the current month (legacy + v2 per-feature),
 * monthly trends, and tenants approaching their usage limits.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { AI_TIER_CONFIGS } from '@/lib/ai/config';
import { getFullUsageStatus } from '@/lib/ai/feature-gate';

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

    // Per-tenant legacy usage for the current month joined with tenant info
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

    const tenantUsage = await Promise.all(
      tenantUsageRows.map(async (row: Record<string, unknown>) => {
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
        const tenantId = row.tenant_id as string;

        // V2: Per-feature usage breakdown for this tenant
        let featureUsage: Record<string, { used: number; limit: number }> = {};
        try {
          featureUsage = await getFullUsageStatus(tenantId);
        } catch {
          // Table may not exist yet
        }

        return {
          tenantId,
          tenantName: row.tenant_name as string,
          plan,
          used,
          limit,
          model,
          featureUsage,
        };
      })
    );

    const totalUsage = tenantUsage.reduce((sum: number, t: { used: number }) => sum + t.used, 0);

    // Tenants at or above 80% of their limit (skip unlimited)
    const approachingLimit = tenantUsage.filter(
      (t: { used: number; limit: number }) =>
        t.limit > 0 && t.used >= t.limit * 0.8
    );

    // Monthly trend: last 6 months aggregated (legacy counters)
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

    // V2 monthly trend: per-feature breakdown last 6 months
    let featureTrend: Record<string, unknown>[] = [];
    try {
      const featureTrendRows = await sql`
        SELECT
          to_char(month, 'YYYY-MM') AS month_key,
          feature,
          SUM(interaction_count)::int AS total
        FROM ai_usage_counters_v2
        WHERE month >= date_trunc('month', NOW() - INTERVAL '5 months')
        GROUP BY month_key, feature
        ORDER BY month_key ASC, feature ASC
      `;
      featureTrend = featureTrendRows.map((row: Record<string, unknown>) => ({
        month: row.month_key as string,
        feature: row.feature as string,
        total: Number(row.total),
      }));
    } catch {
      // ai_usage_counters_v2 may not exist yet
    }

    return NextResponse.json({
      totalUsage,
      tenantUsage,
      monthlyTrend,
      featureTrend,
      approachingLimit,
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
