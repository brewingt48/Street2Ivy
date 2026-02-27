/**
 * ProveGround Match Engine™ — DB-backed Cache
 *
 * Read/write/invalidate match scores in the match_scores table.
 * Lazy computation pattern: compute on first request, serve stale while recomputing.
 */

import { sql } from '@/lib/db';
import type { CachedMatchScore, CompositeScore } from './types';
import { ENGINE_VERSION } from './config';

// ============================================================================
// Read
// ============================================================================

/**
 * Get a cached match score for a student-listing pair.
 * Returns null if no cached score exists.
 */
export async function getCachedScore(
  studentId: string,
  listingId: string
): Promise<CachedMatchScore | null> {
  const rows = await sql`
    SELECT id, student_id, listing_id, tenant_id, composite_score,
           signal_breakdown, is_stale, version, computed_at
    FROM match_scores
    WHERE student_id = ${studentId} AND listing_id = ${listingId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    listingId: row.listing_id as string,
    tenantId: row.tenant_id as string | null,
    compositeScore: Number(row.composite_score),
    signalBreakdown: (row.signal_breakdown || {}) as CompositeScore['signals'],
    isStale: row.is_stale as boolean,
    version: row.version as number,
    computedAt: (row.computed_at as Date).toISOString(),
  };
}

/**
 * Get all cached scores for a student, optionally filtering by staleness.
 */
export async function getStudentScores(
  studentId: string,
  options: { includeStale?: boolean; limit?: number } = {}
): Promise<CachedMatchScore[]> {
  const { includeStale = true, limit = 50 } = options;

  const rows = includeStale
    ? await sql`
        SELECT id, student_id, listing_id, tenant_id, composite_score,
               signal_breakdown, is_stale, version, computed_at
        FROM match_scores
        WHERE student_id = ${studentId}
        ORDER BY composite_score DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, student_id, listing_id, tenant_id, composite_score,
               signal_breakdown, is_stale, version, computed_at
        FROM match_scores
        WHERE student_id = ${studentId} AND is_stale = FALSE
        ORDER BY composite_score DESC
        LIMIT ${limit}
      `;

  return rows.map(mapRow);
}

/**
 * Get all cached scores for a listing (for corporate partner view).
 */
export async function getListingScores(
  listingId: string,
  options: { limit?: number } = {}
): Promise<CachedMatchScore[]> {
  const { limit = 50 } = options;

  const rows = await sql`
    SELECT id, student_id, listing_id, tenant_id, composite_score,
           signal_breakdown, is_stale, version, computed_at
    FROM match_scores
    WHERE listing_id = ${listingId}
    ORDER BY composite_score DESC
    LIMIT ${limit}
  `;

  return rows.map(mapRow);
}

// ============================================================================
// Write
// ============================================================================

/**
 * Upsert a match score into the cache.
 * Creates a history record if the score changed.
 */
export async function upsertScore(
  studentId: string,
  listingId: string,
  tenantId: string | null,
  composite: CompositeScore,
  computationTimeMs: number
): Promise<string> {
  // Check for existing score to create history
  const existing = await getCachedScore(studentId, listingId);

  if (existing) {
    // Update existing
    await sql`
      UPDATE match_scores
      SET composite_score = ${composite.score},
          signal_breakdown = ${JSON.stringify(composite.signals)}::jsonb,
          is_stale = FALSE,
          version = ${ENGINE_VERSION},
          computation_time_ms = ${computationTimeMs},
          computed_at = NOW(),
          updated_at = NOW()
      WHERE student_id = ${studentId} AND listing_id = ${listingId}
    `;

    // Create history record if score changed
    if (Math.abs(existing.compositeScore - composite.score) > 0.5) {
      await sql`
        INSERT INTO match_score_history (match_score_id, old_score, new_score, old_breakdown, new_breakdown, change_reason)
        VALUES (${existing.id}, ${existing.compositeScore}, ${composite.score},
                ${JSON.stringify(existing.signalBreakdown)}::jsonb,
                ${JSON.stringify(composite.signals)}::jsonb,
                'recomputation')
      `;
    }

    return existing.id;
  } else {
    // Insert new
    const rows = await sql`
      INSERT INTO match_scores (student_id, listing_id, tenant_id, composite_score,
                                signal_breakdown, is_stale, version, computation_time_ms,
                                computed_at)
      VALUES (${studentId}, ${listingId}, ${tenantId}, ${composite.score},
              ${JSON.stringify(composite.signals)}::jsonb, FALSE, ${ENGINE_VERSION},
              ${computationTimeMs}, NOW())
      ON CONFLICT (student_id, listing_id) DO UPDATE
      SET composite_score = EXCLUDED.composite_score,
          signal_breakdown = EXCLUDED.signal_breakdown,
          is_stale = FALSE,
          version = EXCLUDED.version,
          computation_time_ms = EXCLUDED.computation_time_ms,
          computed_at = NOW(),
          updated_at = NOW()
      RETURNING id
    `;

    const scoreId = rows[0].id as string;

    // Create initial history record
    await sql`
      INSERT INTO match_score_history (match_score_id, new_score, new_breakdown, change_reason)
      VALUES (${scoreId}, ${composite.score}, ${JSON.stringify(composite.signals)}::jsonb, 'initial')
    `;

    return scoreId;
  }
}

// ============================================================================
// Invalidation
// ============================================================================

/**
 * Mark all scores for a student as stale and queue for recomputation.
 */
export async function invalidateStudentScores(
  studentId: string,
  reason: string = 'profile_update'
): Promise<number> {
  const result = await sql`
    UPDATE match_scores SET is_stale = TRUE, updated_at = NOW()
    WHERE student_id = ${studentId} AND is_stale = FALSE
  `;

  // Queue for recomputation
  await sql`
    INSERT INTO recomputation_queue (student_id, reason, priority)
    VALUES (${studentId}, ${reason}, 5)
    ON CONFLICT DO NOTHING
  `;

  return result.count;
}

/**
 * Mark all scores for a listing as stale and queue for recomputation.
 */
export async function invalidateListingScores(
  listingId: string,
  reason: string = 'listing_update'
): Promise<number> {
  const result = await sql`
    UPDATE match_scores SET is_stale = TRUE, updated_at = NOW()
    WHERE listing_id = ${listingId} AND is_stale = FALSE
  `;

  // Queue each affected student for recomputation
  await sql`
    INSERT INTO recomputation_queue (student_id, listing_id, reason, priority)
    SELECT DISTINCT student_id, ${listingId}, ${reason}, 3
    FROM match_scores
    WHERE listing_id = ${listingId}
    ON CONFLICT DO NOTHING
  `;

  return result.count;
}

/**
 * Get stale scores that need recomputation.
 */
export async function getStaleScores(
  limit: number = 50
): Promise<{ studentId: string; listingId: string }[]> {
  const rows = await sql`
    SELECT rq.student_id, rq.listing_id
    FROM recomputation_queue rq
    WHERE rq.processed_at IS NULL
    ORDER BY rq.priority DESC, rq.queued_at ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    studentId: r.student_id as string,
    listingId: r.listing_id as string,
  }));
}

/**
 * Mark recomputation queue entries as processed.
 */
export async function markProcessed(
  studentId: string,
  listingId: string | null
): Promise<void> {
  if (listingId) {
    await sql`
      UPDATE recomputation_queue
      SET processed_at = NOW()
      WHERE student_id = ${studentId}
        AND listing_id = ${listingId}
        AND processed_at IS NULL
    `;
  } else {
    await sql`
      UPDATE recomputation_queue
      SET processed_at = NOW()
      WHERE student_id = ${studentId}
        AND processed_at IS NULL
    `;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapRow(row: Record<string, unknown>): CachedMatchScore {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    listingId: row.listing_id as string,
    tenantId: row.tenant_id as string | null,
    compositeScore: Number(row.composite_score),
    signalBreakdown: (row.signal_breakdown || {}) as CompositeScore['signals'],
    isStale: row.is_stale as boolean,
    version: row.version as number,
    computedAt: row.computed_at instanceof Date
      ? (row.computed_at as Date).toISOString()
      : (row.computed_at as string),
  };
}
