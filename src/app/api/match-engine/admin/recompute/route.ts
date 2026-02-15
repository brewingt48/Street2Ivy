/**
 * Admin Recompute API
 * POST — Trigger batch recomputation
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Mark all scores as stale to trigger recomputation
    const result = await sql`
      UPDATE match_scores SET is_stale = TRUE, updated_at = NOW()
      WHERE is_stale = FALSE
    `;

    // Queue all for recomputation
    await sql`
      INSERT INTO recomputation_queue (student_id, listing_id, reason, priority)
      SELECT DISTINCT student_id, listing_id, 'manual', 8
      FROM match_scores
      WHERE is_stale = TRUE
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({
      message: 'Recomputation triggered',
      scoresMarkedStale: result.count,
    });
  } catch (error) {
    console.error('Failed to trigger recomputation:', error);
    return NextResponse.json({ error: 'Failed to trigger recomputation' }, { status: 500 });
  }
}
