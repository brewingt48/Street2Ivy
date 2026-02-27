/**
 * Metrics Computation Cron Job
 *
 * POST /api/cron/compute-metrics
 *
 * Computes outcome metrics for all tenants with the outcomesDashboard feature enabled.
 * Called by Heroku Scheduler or external cron. Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { computeAllMetrics } from '@/lib/outcomes';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tenants with outcomesDashboard enabled
    const tenants = await sql`
      SELECT id FROM tenants WHERE features->>'outcomesDashboard' = 'true'
    `;

    if (tenants.length === 0) {
      return NextResponse.json({
        message: 'No tenants with outcomes dashboard enabled',
        processed: 0,
        errors: 0,
      });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const periodStart = ninetyDaysAgo.toISOString().split('T')[0];
    const periodEnd = now.toISOString().split('T')[0];

    let processed = 0;
    let errors = 0;
    const results: Array<{ tenantId: string; status: string; error?: string }> = [];

    for (const tenant of tenants) {
      const tenantId = tenant.id as string;
      try {
        await computeAllMetrics(tenantId, periodStart, periodEnd);
        processed++;
        results.push({ tenantId, status: 'success' });
      } catch (error) {
        errors++;
        results.push({
          tenantId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${tenants.length} tenants`,
      processed,
      errors,
      results,
    });
  } catch (error) {
    console.error('Compute metrics cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
