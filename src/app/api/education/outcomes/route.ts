/**
 * GET /api/education/outcomes — Main outcomes endpoint
 *
 * Returns computed outcome metrics for the institution.
 * Checks for cached metrics (computed within last 24 hours),
 * otherwise computes fresh via computeAllMetrics().
 *
 * Query params: periodStart, periodEnd, cohort
 * Default period: last 90 days
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeAllMetrics } from '@/lib/outcomes';

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
    const cohort = searchParams.get('cohort') || undefined;

    // Check for cached metrics computed within the last 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const cached = cohort
      ? await sql`
          SELECT metric_type, metric_value, metric_metadata, computed_at
          FROM outcome_metrics
          WHERE institution_id = ${tenantId}
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter = ${cohort}
            AND computed_at >= ${twentyFourHoursAgo.toISOString()}
          ORDER BY computed_at DESC
        `
      : await sql`
          SELECT metric_type, metric_value, metric_metadata, computed_at
          FROM outcome_metrics
          WHERE institution_id = ${tenantId}
            AND period_start = ${periodStart}
            AND period_end = ${periodEnd}
            AND cohort_filter IS NULL
            AND computed_at >= ${twentyFourHoursAgo.toISOString()}
          ORDER BY computed_at DESC
        `;

    if (cached.length > 0) {
      // Build MetricsSummary from cached rows
      const metrics: Record<string, { value: number; metadata: Record<string, unknown> }> = {};
      for (const row of cached) {
        metrics[row.metric_type as string] = {
          value: parseFloat(row.metric_value as string),
          metadata: (row.metric_metadata || {}) as Record<string, unknown>,
        };
      }

      return NextResponse.json({
        institutionId: tenantId,
        periodStart,
        periodEnd,
        cohortFilter: cohort || null,
        computedAt: (cached[0].computed_at as Date).toISOString(),
        metrics,
      });
    }

    // Compute fresh metrics
    const result = await computeAllMetrics(tenantId!, periodStart, periodEnd, cohort);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Outcomes endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
