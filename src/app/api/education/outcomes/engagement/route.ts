/**
 * GET /api/education/outcomes/engagement — Engagement-specific metrics
 *
 * Returns:
 * - Student activation funnel data (registered -> profile complete -> first match -> first completion -> repeat)
 * - Engagement distribution histogram
 *
 * Reads from outcome_metrics WHERE metric_type IN ('student_activation_rate', 'engagement_distribution')
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

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
            AND metric_type IN ('student_activation_rate', 'engagement_distribution')
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter = ${cohort}
          ORDER BY computed_at DESC
        `
      : await sql`
          SELECT metric_type, metric_value, metric_metadata, computed_at
          FROM outcome_metrics
          WHERE institution_id = ${tenantId}
            AND metric_type IN ('student_activation_rate', 'engagement_distribution')
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter IS NULL
          ORDER BY computed_at DESC
        `;

    // Deduplicate by metric_type (keep latest computed_at for each)
    const seen = new Set<string>();
    let activationFunnel: { value: number; metadata: Record<string, unknown> } | null = null;
    let engagementDistribution: { value: number; metadata: Record<string, unknown> } | null = null;

    for (const row of rows) {
      const metricType = row.metric_type as string;
      if (seen.has(metricType)) continue;
      seen.add(metricType);

      const parsed = {
        value: parseFloat(row.metric_value as string),
        metadata: (row.metric_metadata || {}) as Record<string, unknown>,
      };

      if (metricType === 'student_activation_rate') {
        activationFunnel = parsed;
      } else if (metricType === 'engagement_distribution') {
        engagementDistribution = parsed;
      }
    }

    return NextResponse.json({
      periodStart,
      periodEnd,
      cohortFilter: cohort,
      activationFunnel,
      engagementDistribution,
    });
  } catch (error) {
    console.error('Engagement metrics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
