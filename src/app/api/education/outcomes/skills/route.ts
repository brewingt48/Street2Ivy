/**
 * GET /api/education/outcomes/skills — Skill metrics
 *
 * Returns:
 * - skills_verified_count
 * - top_skills_verified
 * - avg_readiness_score
 * - readiness_tier_distribution
 *
 * Reads from outcome_metrics for these metric types.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

const SKILL_METRIC_TYPES = [
  'skills_verified_count',
  'top_skills_verified',
  'avg_readiness_score',
  'readiness_tier_distribution',
] as const;

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'outcomesDashboard');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Outcomes Dashboard requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const periodStart = searchParams.get('periodStart') || ninetyDaysAgo.toISOString().split('T')[0];
    const periodEnd = searchParams.get('periodEnd') || now.toISOString().split('T')[0];
    const cohort = searchParams.get('cohort') || null;

    const rows = cohort
      ? await sql`
          SELECT metric_type, metric_value, metric_metadata, computed_at
          FROM outcome_metrics
          WHERE institution_id = ${tenantId}
            AND metric_type IN ('skills_verified_count', 'top_skills_verified', 'avg_readiness_score', 'readiness_tier_distribution')
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter = ${cohort}
          ORDER BY computed_at DESC
        `
      : await sql`
          SELECT metric_type, metric_value, metric_metadata, computed_at
          FROM outcome_metrics
          WHERE institution_id = ${tenantId}
            AND metric_type IN ('skills_verified_count', 'top_skills_verified', 'avg_readiness_score', 'readiness_tier_distribution')
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter IS NULL
          ORDER BY computed_at DESC
        `;

    // Deduplicate by metric_type (keep latest computed_at for each)
    const seen = new Set<string>();
    const metrics: Record<string, { value: number; metadata: Record<string, unknown> }> = {};

    for (const row of rows) {
      const metricType = row.metric_type as string;
      if (seen.has(metricType)) continue;
      seen.add(metricType);

      metrics[metricType] = {
        value: parseFloat(row.metric_value as string),
        metadata: (row.metric_metadata || {}) as Record<string, unknown>,
      };
    }

    return NextResponse.json({
      periodStart,
      periodEnd,
      cohortFilter: cohort,
      metrics,
      availableMetrics: SKILL_METRIC_TYPES,
    });
  } catch (error) {
    console.error('Skills metrics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
