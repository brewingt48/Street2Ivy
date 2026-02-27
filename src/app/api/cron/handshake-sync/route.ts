/**
 * Handshake Sync Cron Job
 *
 * POST /api/cron/handshake-sync
 *
 * Syncs active Handshake integrations based on their sync_frequency.
 * Called by Heroku Scheduler. Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { syncSkillDemandFromHandshake } from '@/lib/handshake/sync';

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

    // Get all active integrations due for sync
    const integrations = await sql`
      SELECT institution_id, sync_frequency, last_sync_at
      FROM handshake_integrations
      WHERE is_active = true
        AND sync_frequency != 'manual'
        AND (
          last_sync_at IS NULL
          OR (sync_frequency = 'daily' AND last_sync_at < NOW() - INTERVAL '1 day')
          OR (sync_frequency = 'weekly' AND last_sync_at < NOW() - INTERVAL '7 days')
        )
    `;

    const results = [];
    for (const integration of integrations) {
      try {
        const result = await syncSkillDemandFromHandshake(integration.institution_id as string);
        results.push({ institutionId: integration.institution_id, status: 'success', ...result });
      } catch (error) {
        results.push({
          institutionId: integration.institution_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${integrations.length} integrations`,
      results,
    });
  } catch (error) {
    console.error('Handshake cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
