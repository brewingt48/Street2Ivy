/**
 * Handshake Correlation Metrics
 *
 * Computes correlation between Proveground engagement and
 * career outcomes (applications on Handshake).
 */

import { sql } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrelationSegment {
  label: string;
  studentCount: number;
  avgProjectsCompleted: number;
  avgReadinessScore: number;
}

export interface CorrelationData {
  segments: CorrelationSegment[];
  handshakeActive: boolean;
  lastSyncAt: string | null;
  insightText: string;
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export async function computeHandshakeCorrelationMetrics(
  institutionId: string,
): Promise<CorrelationData> {
  // 1. Check if Handshake integration is active
  const integrationRows = await sql`
    SELECT is_active, last_sync_at
    FROM handshake_integrations
    WHERE institution_id = ${institutionId}
  `;

  if (
    integrationRows.length === 0 ||
    !integrationRows[0].is_active
  ) {
    return {
      segments: [],
      handshakeActive: false,
      lastSyncAt: null,
      insightText: '',
    };
  }

  const lastSyncAt = integrationRows[0].last_sync_at
    ? new Date(integrationRows[0].last_sync_at as string).toISOString()
    : null;

  // 2. Segment students by Proveground engagement level

  // Active (3+ projects)
  const activeRows = await sql`
    SELECT
      COUNT(DISTINCT u.id)::int AS student_count,
      COALESCE(AVG(completed_counts.cnt), 0) AS avg_projects
    FROM users u
    LEFT JOIN (
      SELECT student_id, COUNT(*)::int AS cnt
      FROM project_applications WHERE status = 'completed'
      GROUP BY student_id
    ) completed_counts ON completed_counts.student_id = u.id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
      AND COALESCE(completed_counts.cnt, 0) >= 3
  `;

  // Moderate (1-2 projects)
  const moderateRows = await sql`
    SELECT
      COUNT(DISTINCT u.id)::int AS student_count,
      COALESCE(AVG(completed_counts.cnt), 0) AS avg_projects
    FROM users u
    LEFT JOIN (
      SELECT student_id, COUNT(*)::int AS cnt
      FROM project_applications WHERE status = 'completed'
      GROUP BY student_id
    ) completed_counts ON completed_counts.student_id = u.id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
      AND COALESCE(completed_counts.cnt, 0) BETWEEN 1 AND 2
  `;

  // Inactive (0 projects)
  const inactiveRows = await sql`
    SELECT
      COUNT(DISTINCT u.id)::int AS student_count,
      COALESCE(AVG(completed_counts.cnt), 0) AS avg_projects
    FROM users u
    LEFT JOIN (
      SELECT student_id, COUNT(*)::int AS cnt
      FROM project_applications WHERE status = 'completed'
      GROUP BY student_id
    ) completed_counts ON completed_counts.student_id = u.id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
      AND COALESCE(completed_counts.cnt, 0) = 0
  `;

  // 3. Average readiness score per segment via skill_gap_snapshots

  const activeReadinessRows = await sql`
    SELECT COALESCE(AVG(latest.overall_readiness_score::numeric), 0)::numeric AS avg_score
    FROM (
      SELECT DISTINCT ON (sgs.student_id) sgs.overall_readiness_score, sgs.student_id
      FROM skill_gap_snapshots sgs
      JOIN users u ON u.id = sgs.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*)::int AS cnt
        FROM project_applications WHERE status = 'completed'
        GROUP BY student_id
      ) completed_counts ON completed_counts.student_id = u.id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
        AND COALESCE(completed_counts.cnt, 0) >= 3
      ORDER BY sgs.student_id, sgs.snapshot_date DESC
    ) latest
  `;

  const moderateReadinessRows = await sql`
    SELECT COALESCE(AVG(latest.overall_readiness_score::numeric), 0)::numeric AS avg_score
    FROM (
      SELECT DISTINCT ON (sgs.student_id) sgs.overall_readiness_score, sgs.student_id
      FROM skill_gap_snapshots sgs
      JOIN users u ON u.id = sgs.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*)::int AS cnt
        FROM project_applications WHERE status = 'completed'
        GROUP BY student_id
      ) completed_counts ON completed_counts.student_id = u.id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
        AND COALESCE(completed_counts.cnt, 0) BETWEEN 1 AND 2
      ORDER BY sgs.student_id, sgs.snapshot_date DESC
    ) latest
  `;

  const inactiveReadinessRows = await sql`
    SELECT COALESCE(AVG(latest.overall_readiness_score::numeric), 0)::numeric AS avg_score
    FROM (
      SELECT DISTINCT ON (sgs.student_id) sgs.overall_readiness_score, sgs.student_id
      FROM skill_gap_snapshots sgs
      JOIN users u ON u.id = sgs.student_id
      LEFT JOIN (
        SELECT student_id, COUNT(*)::int AS cnt
        FROM project_applications WHERE status = 'completed'
        GROUP BY student_id
      ) completed_counts ON completed_counts.student_id = u.id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
        AND COALESCE(completed_counts.cnt, 0) = 0
      ORDER BY sgs.student_id, sgs.snapshot_date DESC
    ) latest
  `;

  const activeAvgReadiness = Math.round(Number(activeReadinessRows[0].avg_score) * 100) / 100;
  const moderateAvgReadiness = Math.round(Number(moderateReadinessRows[0].avg_score) * 100) / 100;
  const inactiveAvgReadiness = Math.round(Number(inactiveReadinessRows[0].avg_score) * 100) / 100;

  const segments: CorrelationSegment[] = [
    {
      label: 'Active (3+ projects)',
      studentCount: Number(activeRows[0].student_count) || 0,
      avgProjectsCompleted: Math.round(Number(activeRows[0].avg_projects) * 100) / 100,
      avgReadinessScore: activeAvgReadiness,
    },
    {
      label: 'Moderate (1-2 projects)',
      studentCount: Number(moderateRows[0].student_count) || 0,
      avgProjectsCompleted: Math.round(Number(moderateRows[0].avg_projects) * 100) / 100,
      avgReadinessScore: moderateAvgReadiness,
    },
    {
      label: 'Inactive (0 projects)',
      studentCount: Number(inactiveRows[0].student_count) || 0,
      avgProjectsCompleted: 0,
      avgReadinessScore: inactiveAvgReadiness,
    },
  ];

  // 4. Generate insight text
  const readinessDiff = Math.round((activeAvgReadiness - inactiveAvgReadiness) * 10) / 10;
  const insightText =
    readinessDiff > 0
      ? `Active students (3+ projects) have an average readiness score ${readinessDiff} points higher than inactive students.`
      : readinessDiff < 0
        ? `Inactive students currently show a higher average readiness score than active students by ${Math.abs(readinessDiff)} points.`
        : 'Active and inactive students currently have similar average readiness scores.';

  return {
    segments,
    handshakeActive: true,
    lastSyncAt,
    insightText,
  };
}
