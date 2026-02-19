/**
 * Cron Recomputation Endpoint
 *
 * POST /api/cron/recompute-matches
 *
 * Processes stale match scores from the recomputation queue.
 * Called by Heroku Scheduler or external cron every 10 minutes.
 * Protected by CRON_SECRET environment variable.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { computeMatch } from '@/lib/match-engine';

const BATCH_SIZE = 50;

export async function POST(request: Request) {
  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending items from queue (join users to get tenant_id)
    const items = await sql`
      SELECT rq.id, rq.student_id, rq.listing_id, rq.reason,
             u.tenant_id
      FROM recomputation_queue rq
      LEFT JOIN users u ON u.id = rq.student_id
      WHERE rq.processed_at IS NULL
      ORDER BY rq.priority DESC, rq.queued_at ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (items.length === 0) {
      return NextResponse.json({
        message: 'No items to process',
        processed: 0,
        remaining: 0,
        errors: 0,
      });
    }

    let processed = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const studentId = item.student_id as string;
        const listingId = item.listing_id as string | null;

        if (listingId) {
          // Recompute specific student-listing pair
          await computeMatch(studentId, listingId, {
            forceRecompute: true,
            tenantId: item.tenant_id as string | null,
          });
        } else {
          // Recompute all matches for this student (get their stale scores)
          const staleScores = await sql`
            SELECT listing_id FROM match_scores
            WHERE student_id = ${studentId} AND is_stale = TRUE
            LIMIT 20
          `;

          for (const score of staleScores) {
            try {
              await computeMatch(studentId, score.listing_id as string, {
                forceRecompute: true,
                tenantId: item.tenant_id as string | null,
              });
            } catch {
              // Skip individual failures
            }
          }
        }

        // Mark as processed
        await sql`
          UPDATE recomputation_queue
          SET processed_at = NOW(), attempts = attempts + 1
          WHERE id = ${item.id}
        `;

        processed++;
      } catch (err) {
        errors++;
        // Record error on queue item
        await sql`
          UPDATE recomputation_queue
          SET error = ${err instanceof Error ? err.message : 'Unknown error'},
              attempts = attempts + 1
          WHERE id = ${item.id}
        `;
      }
    }

    // Count remaining
    const [remaining] = await sql`
      SELECT COUNT(*) as count FROM recomputation_queue
      WHERE processed_at IS NULL
    `;

    return NextResponse.json({
      message: 'Recomputation batch complete',
      processed,
      remaining: Number(remaining?.count || 0),
      errors,
      batchSize: items.length,
    });
  } catch (error) {
    console.error('Cron recompute failed:', error);
    return NextResponse.json({ error: 'Cron recompute failed' }, { status: 500 });
  }
}
