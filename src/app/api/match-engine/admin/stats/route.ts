/**
 * Admin Stats API
 * GET — Get matching statistics
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [scoreStats] = await sql`
      SELECT
        COUNT(*) as total_scores,
        COUNT(*) FILTER (WHERE is_stale) as stale_scores,
        AVG(composite_score)::numeric(5,2) as avg_score,
        MAX(composite_score)::numeric(5,2) as max_score,
        MIN(composite_score)::numeric(5,2) as min_score,
        AVG(computation_time_ms)::integer as avg_computation_ms,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT listing_id) as unique_listings
      FROM match_scores
    `;

    const [queueStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE processed_at IS NULL) as pending,
        COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed,
        COUNT(*) as total
      FROM recomputation_queue
    `;

    const [feedbackStats] = await sql`
      SELECT
        COUNT(*) as total_feedback,
        AVG(rating)::numeric(3,2) as avg_rating
      FROM match_feedback
    `;

    return NextResponse.json({
      scores: scoreStats,
      queue: queueStats,
      feedback: feedbackStats,
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
