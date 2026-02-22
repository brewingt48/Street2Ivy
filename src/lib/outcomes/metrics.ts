/**
 * Outcomes Metrics Engine
 *
 * Computes and persists institutional outcome metrics for the Proveground platform.
 * Covers project completion, skill verification, employer engagement,
 * student activation, and period-over-period comparative deltas.
 */

import { sql } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricResult {
  value: number;
  metadata: Record<string, unknown>;
}

export interface MetricsSummary {
  institutionId: string;
  periodStart: string;
  periodEnd: string;
  cohortFilter: string | null;
  computedAt: string;
  metrics: Record<string, { value: number; metadata: Record<string, unknown> }>;
}

export interface ComparativeMetrics {
  currentPeriod: Record<string, number>;
  previousPeriod: Record<string, number>;
  deltas: Record<string, { absolute: number; percentageChange: number | null }>;
}

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

async function saveMetric(
  institutionId: string,
  metricType: string,
  metricValue: number,
  metadata: Record<string, unknown>,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<void> {
  // Upsert: delete existing for same type/period/cohort, then insert
  await sql`
    DELETE FROM outcome_metrics
    WHERE institution_id = ${institutionId}
      AND metric_type = ${metricType}
      AND period_start = ${periodStart}
      AND period_end = ${periodEnd}
      AND cohort_filter IS NOT DISTINCT FROM ${cohortFilter || null}
  `;
  await sql`
    INSERT INTO outcome_metrics (
      institution_id, metric_type, metric_value, metric_metadata,
      period_start, period_end, cohort_filter
    )
    VALUES (
      ${institutionId}, ${metricType}, ${metricValue},
      ${JSON.stringify(metadata)}::jsonb,
      ${periodStart}, ${periodEnd}, ${cohortFilter || null}
    )
  `;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function computeAllMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<MetricsSummary> {
  const metrics: Record<string, { value: number; metadata: Record<string, unknown> }> = {};

  const projectMetrics = await computeProjectMetrics(institutionId, periodStart, periodEnd, cohortFilter);
  Object.assign(metrics, projectMetrics);

  const skillMetrics = await computeSkillMetrics(institutionId, periodStart, periodEnd, cohortFilter);
  Object.assign(metrics, skillMetrics);

  const employerMetrics = await computeEmployerMetrics(institutionId, periodStart, periodEnd, cohortFilter);
  Object.assign(metrics, employerMetrics);

  const engagementMetrics = await computeStudentEngagementMetrics(institutionId, periodStart, periodEnd, cohortFilter);
  Object.assign(metrics, engagementMetrics);

  return {
    institutionId,
    periodStart,
    periodEnd,
    cohortFilter: cohortFilter ?? null,
    computedAt: new Date().toISOString(),
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Project metrics
// ---------------------------------------------------------------------------

export async function computeProjectMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<Record<string, MetricResult>> {
  const results: Record<string, MetricResult> = {};

  // total_projects_completed
  const completedRows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM project_applications pa
    JOIN users u ON u.id = pa.student_id
    WHERE u.tenant_id = ${institutionId}
      AND pa.status = 'completed'
      AND pa.completed_at >= ${periodStart}::date
      AND pa.completed_at < (${periodEnd}::date + INTERVAL '1 day')
  `;
  const totalCompleted = Number(completedRows[0].cnt) || 0;
  results.total_projects_completed = { value: totalCompleted, metadata: {} };
  await saveMetric(institutionId, 'total_projects_completed', totalCompleted, {}, periodStart, periodEnd, cohortFilter);

  // avg_projects_per_student (active = at least one app in period)
  const activeStudentRows = await sql`
    SELECT COUNT(DISTINCT pa.student_id)::int AS cnt
    FROM project_applications pa
    JOIN users u ON u.id = pa.student_id
    WHERE u.tenant_id = ${institutionId}
      AND pa.submitted_at >= ${periodStart}::date
      AND pa.submitted_at < (${periodEnd}::date + INTERVAL '1 day')
  `;
  const activeStudents = Number(activeStudentRows[0].cnt) || 0;
  const avgProjectsPerStudent = activeStudents > 0
    ? Math.round((totalCompleted / activeStudents) * 100) / 100
    : 0;
  results.avg_projects_per_student = {
    value: avgProjectsPerStudent,
    metadata: { activeStudents, totalCompleted },
  };
  await saveMetric(
    institutionId, 'avg_projects_per_student', avgProjectsPerStudent,
    { activeStudents, totalCompleted }, periodStart, periodEnd, cohortFilter,
  );

  // project_completion_rate
  const acceptedRows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM project_applications pa
    JOIN users u ON u.id = pa.student_id
    WHERE u.tenant_id = ${institutionId}
      AND pa.status = 'accepted'
  `;
  const totalAccepted = Number(acceptedRows[0].cnt) || 0;
  const completionDenominator = totalCompleted + totalAccepted;
  const completionRate = completionDenominator > 0
    ? Math.round((totalCompleted / completionDenominator) * 10000) / 100
    : 0;
  results.project_completion_rate = {
    value: completionRate,
    metadata: { completed: totalCompleted, accepted: totalAccepted },
  };
  await saveMetric(
    institutionId, 'project_completion_rate', completionRate,
    { completed: totalCompleted, accepted: totalAccepted }, periodStart, periodEnd, cohortFilter,
  );

  // time_to_first_match: AVG days from users.created_at to first application submitted_at
  const timeToMatchRows = await sql`
    SELECT AVG(EXTRACT(EPOCH FROM (first_app.first_submitted - u.created_at)) / 86400)::numeric AS avg_days
    FROM users u
    JOIN (
      SELECT student_id, MIN(submitted_at) AS first_submitted
      FROM project_applications
      GROUP BY student_id
    ) first_app ON first_app.student_id = u.id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
  `;
  const avgDaysToFirstMatch = timeToMatchRows[0].avg_days != null
    ? Math.round(Number(timeToMatchRows[0].avg_days) * 100) / 100
    : 0;
  results.time_to_first_match = { value: avgDaysToFirstMatch, metadata: {} };
  await saveMetric(
    institutionId, 'time_to_first_match', avgDaysToFirstMatch,
    {}, periodStart, periodEnd, cohortFilter,
  );

  return results;
}

// ---------------------------------------------------------------------------
// Skill metrics
// ---------------------------------------------------------------------------

export async function computeSkillMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<Record<string, MetricResult>> {
  const results: Record<string, MetricResult> = {};

  // skills_verified_count
  const verifiedRows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM user_skills us
    JOIN users u ON u.id = us.user_id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
      AND us.verification_source != 'self_reported'
      AND us.verified_at >= ${periodStart}::date
      AND us.verified_at < (${periodEnd}::date + INTERVAL '1 day')
  `;
  const skillsVerified = Number(verifiedRows[0].cnt) || 0;
  results.skills_verified_count = { value: skillsVerified, metadata: {} };
  await saveMetric(
    institutionId, 'skills_verified_count', skillsVerified,
    {}, periodStart, periodEnd, cohortFilter,
  );

  // top_skills_verified
  const topSkillRows = await sql`
    SELECT s.name, COUNT(*)::int AS cnt
    FROM user_skills us
    JOIN users u ON u.id = us.user_id
    JOIN skills s ON s.id = us.skill_id
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
      AND us.verification_source != 'self_reported'
      AND us.verified_at >= ${periodStart}::date
      AND us.verified_at < (${periodEnd}::date + INTERVAL '1 day')
    GROUP BY s.name
    ORDER BY cnt DESC
    LIMIT 15
  `;
  const topSkillsList = topSkillRows.map((r) => ({
    skill: r.name as string,
    count: Number(r.cnt),
  }));
  results.top_skills_verified = { value: topSkillsList.length, metadata: { skills: topSkillsList } };
  await saveMetric(
    institutionId, 'top_skills_verified', topSkillsList.length,
    { skills: topSkillsList }, periodStart, periodEnd, cohortFilter,
  );

  // avg_readiness_score — latest snapshot per student
  const readinessRows = await sql`
    SELECT AVG(latest.overall_readiness_score::numeric)::numeric AS avg_score
    FROM (
      SELECT DISTINCT ON (sgs.student_id) sgs.overall_readiness_score
      FROM skill_gap_snapshots sgs
      JOIN users u ON u.id = sgs.student_id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
      ORDER BY sgs.student_id, sgs.snapshot_date DESC
    ) latest
  `;
  const avgReadiness = readinessRows[0].avg_score != null
    ? Math.round(Number(readinessRows[0].avg_score) * 100) / 100
    : 0;
  results.avg_readiness_score = { value: avgReadiness, metadata: {} };
  await saveMetric(
    institutionId, 'avg_readiness_score', avgReadiness,
    {}, periodStart, periodEnd, cohortFilter,
  );

  // readiness_tier_distribution
  const tierRows = await sql`
    SELECT
      CASE
        WHEN latest.score >= 76 THEN 'Hire-Ready'
        WHEN latest.score >= 51 THEN 'Demonstrating'
        WHEN latest.score >= 26 THEN 'Building'
        ELSE 'Exploring'
      END AS tier,
      COUNT(*)::int AS cnt
    FROM (
      SELECT DISTINCT ON (sgs.student_id) sgs.overall_readiness_score::numeric AS score
      FROM skill_gap_snapshots sgs
      JOIN users u ON u.id = sgs.student_id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
      ORDER BY sgs.student_id, sgs.snapshot_date DESC
    ) latest
    GROUP BY tier
  `;
  const tierDistribution: Record<string, number> = {
    Exploring: 0,
    Building: 0,
    Demonstrating: 0,
    'Hire-Ready': 0,
  };
  for (const row of tierRows) {
    tierDistribution[row.tier as string] = Number(row.cnt);
  }
  results.readiness_tier_distribution = {
    value: 0,
    metadata: { distribution: tierDistribution },
  };
  await saveMetric(
    institutionId, 'readiness_tier_distribution', 0,
    { distribution: tierDistribution }, periodStart, periodEnd, cohortFilter,
  );

  return results;
}

// ---------------------------------------------------------------------------
// Employer metrics
// ---------------------------------------------------------------------------

export async function computeEmployerMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<Record<string, MetricResult>> {
  const results: Record<string, MetricResult> = {};

  // employer_engagement_count — distinct listing authors that have had applications from this institution's students
  const engagementRows = await sql`
    SELECT COUNT(DISTINCT l.author_id)::int AS cnt
    FROM listings l
    WHERE l.id IN (
      SELECT pa.listing_id
      FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE u.tenant_id = ${institutionId}
        AND pa.submitted_at >= ${periodStart}::date
        AND pa.submitted_at < (${periodEnd}::date + INTERVAL '1 day')
    )
  `;
  const employerCount = Number(engagementRows[0].cnt) || 0;
  results.employer_engagement_count = { value: employerCount, metadata: {} };
  await saveMetric(
    institutionId, 'employer_engagement_count', employerCount,
    {}, periodStart, periodEnd, cohortFilter,
  );

  // employer_satisfaction_avg — AVG rating from student_ratings for students in institution
  const satisfactionRows = await sql`
    SELECT AVG(sr.rating)::numeric AS avg_rating, COUNT(*)::int AS total_ratings
    FROM student_ratings sr
    JOIN users u ON u.id = sr.student_id
    WHERE u.tenant_id = ${institutionId}
  `;
  const avgSatisfaction = satisfactionRows[0].avg_rating != null
    ? Math.round(Number(satisfactionRows[0].avg_rating) * 100) / 100
    : 0;
  const totalRatings = Number(satisfactionRows[0].total_ratings) || 0;
  results.employer_satisfaction_avg = {
    value: avgSatisfaction,
    metadata: { totalRatings },
  };
  await saveMetric(
    institutionId, 'employer_satisfaction_avg', avgSatisfaction,
    { totalRatings }, periodStart, periodEnd, cohortFilter,
  );

  // repeat_employer_rate — listing authors with 2+ listings / total distinct authors (percentage)
  const repeatRows = await sql`
    SELECT
      COUNT(*)::int AS total_authors,
      COUNT(*) FILTER (WHERE listing_count >= 2)::int AS repeat_authors
    FROM (
      SELECT l.author_id, COUNT(*)::int AS listing_count
      FROM listings l
      WHERE l.id IN (
        SELECT pa.listing_id
        FROM project_applications pa
        JOIN users u ON u.id = pa.student_id
        WHERE u.tenant_id = ${institutionId}
      )
      GROUP BY l.author_id
    ) author_counts
  `;
  const totalAuthors = Number(repeatRows[0].total_authors) || 0;
  const repeatAuthors = Number(repeatRows[0].repeat_authors) || 0;
  const repeatRate = totalAuthors > 0
    ? Math.round((repeatAuthors / totalAuthors) * 10000) / 100
    : 0;
  results.repeat_employer_rate = {
    value: repeatRate,
    metadata: { totalAuthors, repeatAuthors },
  };
  await saveMetric(
    institutionId, 'repeat_employer_rate', repeatRate,
    { totalAuthors, repeatAuthors }, periodStart, periodEnd, cohortFilter,
  );

  return results;
}

// ---------------------------------------------------------------------------
// Student engagement metrics
// ---------------------------------------------------------------------------

export async function computeStudentEngagementMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
  cohortFilter?: string,
): Promise<Record<string, MetricResult>> {
  const results: Record<string, MetricResult> = {};

  // student_activation_rate — students with at least one completed app / total students
  const activationRows = await sql`
    SELECT
      COUNT(DISTINCT u.id)::int AS total_students,
      COUNT(DISTINCT pa.student_id)::int AS activated_students
    FROM users u
    LEFT JOIN project_applications pa
      ON pa.student_id = u.id AND pa.status = 'completed'
    WHERE u.tenant_id = ${institutionId}
      AND u.role = 'student'
  `;
  const totalStudents = Number(activationRows[0].total_students) || 0;
  const activatedStudents = Number(activationRows[0].activated_students) || 0;
  const activationRate = totalStudents > 0
    ? Math.round((activatedStudents / totalStudents) * 10000) / 100
    : 0;
  results.student_activation_rate = {
    value: activationRate,
    metadata: { totalStudents, activatedStudents },
  };
  await saveMetric(
    institutionId, 'student_activation_rate', activationRate,
    { totalStudents, activatedStudents }, periodStart, periodEnd, cohortFilter,
  );

  // engagement_distribution — histogram of completed project counts per student
  const distRows = await sql`
    SELECT
      CASE
        WHEN completed_count = 0 THEN '0 projects'
        WHEN completed_count = 1 THEN '1 project'
        WHEN completed_count BETWEEN 2 AND 3 THEN '2-3 projects'
        WHEN completed_count BETWEEN 4 AND 5 THEN '4-5 projects'
        ELSE '6+ projects'
      END AS bucket,
      COUNT(*)::int AS cnt
    FROM (
      SELECT u.id, COALESCE(completed.cnt, 0) AS completed_count
      FROM users u
      LEFT JOIN (
        SELECT student_id, COUNT(*)::int AS cnt
        FROM project_applications
        WHERE status = 'completed'
        GROUP BY student_id
      ) completed ON completed.student_id = u.id
      WHERE u.tenant_id = ${institutionId}
        AND u.role = 'student'
    ) student_counts
    GROUP BY bucket
    ORDER BY
      CASE bucket
        WHEN '0 projects' THEN 1
        WHEN '1 project' THEN 2
        WHEN '2-3 projects' THEN 3
        WHEN '4-5 projects' THEN 4
        WHEN '6+ projects' THEN 5
      END
  `;
  const distribution: Record<string, number> = {};
  for (const row of distRows) {
    distribution[row.bucket as string] = Number(row.cnt);
  }
  results.engagement_distribution = {
    value: 0,
    metadata: { distribution },
  };
  await saveMetric(
    institutionId, 'engagement_distribution', 0,
    { distribution }, periodStart, periodEnd, cohortFilter,
  );

  return results;
}

// ---------------------------------------------------------------------------
// Comparative metrics (period-over-period)
// ---------------------------------------------------------------------------

export async function computeComparativeMetrics(
  institutionId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ComparativeMetrics> {
  // Calculate the previous period with the same duration shifted back
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - durationMs);

  const prevStartStr = prevStart.toISOString().split('T')[0];
  const prevEndStr = prevEnd.toISOString().split('T')[0];

  const keyMetrics = [
    'total_projects_completed',
    'avg_projects_per_student',
    'project_completion_rate',
    'skills_verified_count',
    'avg_readiness_score',
    'employer_engagement_count',
    'employer_satisfaction_avg',
    'student_activation_rate',
  ];

  // Fetch current period metrics
  const currentRows = await sql`
    SELECT metric_type, metric_value
    FROM outcome_metrics
    WHERE institution_id = ${institutionId}
      AND period_start = ${periodStart}
      AND period_end = ${periodEnd}
      AND metric_type = ANY(${keyMetrics}::text[])
  `;
  const currentPeriod: Record<string, number> = {};
  for (const row of currentRows) {
    currentPeriod[row.metric_type as string] = Number(row.metric_value) || 0;
  }

  // Fetch previous period metrics
  const prevRows = await sql`
    SELECT metric_type, metric_value
    FROM outcome_metrics
    WHERE institution_id = ${institutionId}
      AND period_start = ${prevStartStr}
      AND period_end = ${prevEndStr}
      AND metric_type = ANY(${keyMetrics}::text[])
  `;
  const previousPeriod: Record<string, number> = {};
  for (const row of prevRows) {
    previousPeriod[row.metric_type as string] = Number(row.metric_value) || 0;
  }

  // Calculate deltas
  const deltas: Record<string, { absolute: number; percentageChange: number | null }> = {};
  for (const metric of keyMetrics) {
    const curr = currentPeriod[metric] ?? 0;
    const prev = previousPeriod[metric] ?? 0;
    const absolute = Math.round((curr - prev) * 100) / 100;
    const percentageChange = prev !== 0
      ? Math.round(((curr - prev) / prev) * 10000) / 100
      : null;
    deltas[metric] = { absolute, percentageChange };
  }

  return { currentPeriod, previousPeriod, deltas };
}
