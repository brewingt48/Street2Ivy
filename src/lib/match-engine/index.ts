/**
 * ProveGround Match Engine™ — Public API
 *
 * The main entry point for computing and retrieving match scores.
 * Implements lazy computation with DB-backed caching.
 */

import { sql } from '@/lib/db';
import { scoreTemporalFit } from './signals/temporal';
import { scoreSkillsAlignment } from './signals/skills';
import { scoreSustainability } from './signals/sustainability';
import { scoreGrowthTrajectory } from './signals/growth';
import { scoreTrustReliability } from './signals/trust';
import { scoreNetworkAffinity } from './signals/network';
import { computeCompositeScore } from './composite';
import { getCachedScore, upsertScore, getStudentScores, getListingScores } from './cache';
import { resolveConfig, DEFAULT_CONFIG } from './config';
import type {
  StudentData,
  ListingData,
  AthleticTransferSkill,
  MatchResult,
  StudentMatchResult,
  CompositeScore,
  MatchEngineConfigData,
  SignalResult,
} from './types';

// Re-export types
export type {
  MatchResult,
  StudentMatchResult,
  CompositeScore,
  MatchEngineConfigData,
  SignalResult,
  StudentData,
  ListingData,
  AthleticTransferSkill,
  CachedMatchScore,
} from './types';

export { invalidateStudentScores, invalidateListingScores } from './cache';
export { computeAttractivenessScore, getCompanyAttractiveness } from './corporate';
export { getAvailabilityWindows, calculateAvailableHours } from './availability';

// ============================================================================
// Core: Compute Match
// ============================================================================

/**
 * Compute the match score for a student-listing pair.
 * Uses cache if available and not stale, otherwise computes fresh.
 */
export async function computeMatch(
  studentId: string,
  listingId: string,
  options: { forceRecompute?: boolean; tenantId?: string | null; config?: MatchEngineConfigData } = {}
): Promise<CompositeScore> {
  const { forceRecompute = false, tenantId = null, config } = options;

  // Check cache first
  if (!forceRecompute) {
    const cached = await getCachedScore(studentId, listingId);
    if (cached && !cached.isStale) {
      return {
        score: cached.compositeScore,
        signals: cached.signalBreakdown,
        computedAt: cached.computedAt,
        version: cached.version,
      };
    }
  }

  // Load data
  const startTime = Date.now();
  const [studentData, listingData, athleticTransfers] = await Promise.all([
    loadStudentData(studentId),
    loadListingData(listingId),
    loadAthleticTransfers(studentId),
  ]);

  if (!studentData || !listingData) {
    return {
      score: 0,
      signals: {} as CompositeScore['signals'],
      computedAt: new Date().toISOString(),
      version: 1,
    };
  }

  // Resolve config
  const engineConfig = config || DEFAULT_CONFIG;

  // Compute all signals
  const signals: SignalResult[] = [
    scoreTemporalFit(studentData, listingData),
    scoreSkillsAlignment(studentData, listingData, athleticTransfers),
    scoreSustainability(studentData, listingData),
    scoreGrowthTrajectory(studentData, listingData),
    scoreTrustReliability(studentData),
    scoreNetworkAffinity(studentData, listingData),
  ];

  // Aggregate
  const composite = computeCompositeScore(signals, engineConfig.signalWeights);
  const computationTimeMs = Date.now() - startTime;

  // Cache the result
  await upsertScore(
    studentId,
    listingId,
    tenantId || studentData.tenantId,
    composite,
    computationTimeMs
  );

  return composite;
}

// ============================================================================
// Batch: Get Student Matches
// ============================================================================

/**
 * Get all match scores for a student against published listings.
 * Returns a ranked list, computing scores lazily for new listings.
 */
export async function getStudentMatches(
  studentId: string,
  options: {
    limit?: number;
    minScore?: number;
    tenantId?: string | null;
    config?: MatchEngineConfigData;
  } = {}
): Promise<MatchResult[]> {
  const { limit = 50, minScore = 0, tenantId = null, config } = options;

  // Get all published listings the student could match with
  const listings = tenantId
    ? await sql`
        SELECT id FROM listings
        WHERE status = 'published' AND tenant_id = ${tenantId}
        ORDER BY published_at DESC NULLS LAST
        LIMIT 200
      `
    : await sql`
        SELECT id FROM listings
        WHERE status = 'published'
        ORDER BY published_at DESC NULLS LAST
        LIMIT 200
      `;

  // Check which ones have cached scores
  const cachedScores = await getStudentScores(studentId, { limit: 200 });
  const cachedMap = new Map(cachedScores.map((c) => [c.listingId, c]));

  // Compute missing or stale scores (limit batch to avoid timeout)
  const toCompute: string[] = [];
  for (const listing of listings) {
    const lid = listing.id as string;
    const cached = cachedMap.get(lid);
    if (!cached || cached.isStale) {
      toCompute.push(lid);
    }
  }

  // Compute in batches (max 20 to stay under timeout)
  const computeLimit = Math.min(toCompute.length, 20);
  for (let i = 0; i < computeLimit; i++) {
    try {
      await computeMatch(studentId, toCompute[i], { tenantId, config });
    } catch {
      // Skip failed computations
    }
  }

  // Re-fetch all scores after computation
  const allScores = await getStudentScores(studentId, { limit });

  // Build results with listing details
  const results: MatchResult[] = [];
  for (const score of allScores) {
    if (score.compositeScore < minScore) continue;

    const listingData = await loadListingData(score.listingId);
    if (!listingData) continue;

    const skillsDetails = score.signalBreakdown?.skills?.details as Record<string, unknown> || {};

    results.push({
      listingId: score.listingId,
      studentId: score.studentId,
      compositeScore: score.compositeScore,
      signals: score.signalBreakdown,
      listing: listingData,
      matchedSkills: (skillsDetails.matchedSkills as string[]) || [],
      missingSkills: (skillsDetails.missingSkills as string[]) || [],
      athleticTransferSkills: (skillsDetails.athleticTransferSkills as AthleticTransferSkill[]) || [],
    });
  }

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore - a.compositeScore);

  return results.slice(0, limit);
}

// ============================================================================
// Batch: Get Listing Matches (for Corporate Partners)
// ============================================================================

/**
 * Get all student matches for a specific listing.
 * Computes scores lazily for students who haven't been scored yet.
 */
export async function getListingMatches(
  listingId: string,
  options: {
    limit?: number;
    minScore?: number;
    tenantId?: string | null;
    config?: MatchEngineConfigData;
  } = {}
): Promise<StudentMatchResult[]> {
  const { limit = 50, minScore = 0, tenantId = null, config } = options;

  // Get students who could match with this listing
  const students = tenantId
    ? await sql`
        SELECT id FROM users
        WHERE role = 'student' AND tenant_id = ${tenantId}
        LIMIT 200
      `
    : await sql`
        SELECT id FROM users
        WHERE role = 'student'
        LIMIT 200
      `;

  // Check cached scores
  const cachedScores = await getListingScores(listingId, { limit: 200 });
  const cachedMap = new Map(cachedScores.map((c) => [c.studentId, c]));

  // Compute missing scores (limit batch)
  const toCompute: string[] = [];
  for (const student of students) {
    const sid = student.id as string;
    const cached = cachedMap.get(sid);
    if (!cached || cached.isStale) {
      toCompute.push(sid);
    }
  }

  const computeLimit = Math.min(toCompute.length, 20);
  for (let i = 0; i < computeLimit; i++) {
    try {
      await computeMatch(toCompute[i], listingId, { tenantId, config });
    } catch {
      // Skip failed computations
    }
  }

  // Re-fetch all scores
  const allScores = await getListingScores(listingId, { limit });

  // Build results with student details
  const results: StudentMatchResult[] = [];
  for (const score of allScores) {
    if (score.compositeScore < minScore) continue;

    const [student] = await sql`
      SELECT id, first_name, last_name, email, university
      FROM users WHERE id = ${score.studentId}
    `;
    if (!student) continue;

    const skillsDetails = score.signalBreakdown?.skills?.details as Record<string, unknown> || {};

    results.push({
      studentId: score.studentId,
      firstName: student.first_name as string,
      lastName: student.last_name as string,
      email: student.email as string,
      university: student.university as string | null,
      compositeScore: score.compositeScore,
      signals: score.signalBreakdown,
      matchedSkills: (skillsDetails.matchedSkills as string[]) || [],
      missingSkills: (skillsDetails.missingSkills as string[]) || [],
      athleticTransferSkills: (skillsDetails.athleticTransferSkills as AthleticTransferSkill[]) || [],
    });
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);

  return results.slice(0, limit);
}

// ============================================================================
// Data Loaders
// ============================================================================

/**
 * Load all data needed to score a student.
 */
async function loadStudentData(studentId: string): Promise<StudentData | null> {
  // Basic profile
  const [user] = await sql`
    SELECT id, tenant_id, gpa, public_data, created_at
    FROM users WHERE id = ${studentId}
  `;
  if (!user) return null;

  // Skills with proficiency
  const skills = await sql`
    SELECT s.name, s.category, COALESCE(us.proficiency_level, 3) as proficiency_level
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ${studentId}
  `;

  // Schedules
  const schedules = await sql`
    SELECT ss.id, ss.schedule_type, ss.sport_season_id,
           sp.sport_name, sp.season_type, sp.start_month, sp.end_month,
           COALESCE(sp.practice_hours_per_week, 0)::numeric as practice_hours_per_week,
           COALESCE(sp.competition_hours_per_week, 0)::numeric as competition_hours_per_week,
           COALESCE(sp.travel_days_per_month, 0) as travel_days_per_month,
           COALESCE(sp.intensity_level, 3) as intensity_level,
           ss.custom_blocks, ss.travel_conflicts,
           ss.available_hours_per_week, ss.effective_start, ss.effective_end,
           ss.is_active
    FROM student_schedules ss
    LEFT JOIN sport_seasons sp ON sp.id = ss.sport_season_id
    WHERE ss.user_id = ${studentId} AND ss.is_active = TRUE
  `;

  // Application history
  const appHistory = await sql`
    SELECT pa.listing_id, pa.status, l.category, l.skills_required, pa.created_at
    FROM project_applications pa
    JOIN listings l ON l.id = pa.listing_id
    WHERE pa.student_id = ${studentId}
    ORDER BY pa.created_at DESC
  `;

  // Completion stats
  const accepted = appHistory.filter(
    (a) => a.status === 'accepted' || a.status === 'completed'
  );
  const completed = appHistory.filter((a) => a.status === 'completed');
  const completionRate = accepted.length > 0 ? completed.length / accepted.length : 0;

  // Active concurrent listings
  const [concurrent] = await sql`
    SELECT COUNT(*) as count
    FROM project_applications
    WHERE student_id = ${studentId} AND status = 'accepted'
  `;

  // Ratings
  const [ratingStats] = await sql`
    SELECT AVG(r.rating)::numeric(3,2) as avg_rating, COUNT(r.id) as count
    FROM student_ratings r
    WHERE r.student_id = ${studentId}
  `;

  const publicData = (user.public_data || {}) as Record<string, unknown>;

  return {
    id: studentId,
    tenantId: user.tenant_id as string | null,
    skills: skills.map((s) => ({
      name: s.name as string,
      category: s.category as string,
      proficiencyLevel: Number(s.proficiency_level) || 3,
    })),
    schedules: schedules.map((s) => ({
      id: s.id as string,
      scheduleType: s.schedule_type as string,
      sportSeasonId: s.sport_season_id as string | null,
      sportName: s.sport_name as string | undefined,
      seasonType: s.season_type as string | undefined,
      startMonth: s.start_month as number | undefined,
      endMonth: s.end_month as number | undefined,
      practiceHoursPerWeek: Number(s.practice_hours_per_week) || 0,
      competitionHoursPerWeek: Number(s.competition_hours_per_week) || 0,
      travelDaysPerMonth: Number(s.travel_days_per_month) || 0,
      intensityLevel: Number(s.intensity_level) || 3,
      customBlocks: (s.custom_blocks || []) as StudentData['schedules'][0]['customBlocks'],
      travelConflicts: (s.travel_conflicts || []) as StudentData['schedules'][0]['travelConflicts'],
      availableHoursPerWeek: s.available_hours_per_week ? Number(s.available_hours_per_week) : null,
      effectiveStart: s.effective_start as string | null,
      effectiveEnd: s.effective_end as string | null,
      isActive: s.is_active as boolean,
    })),
    sportName: schedules.length > 0 ? (schedules[0].sport_name as string | null) : null,
    position: null, // Would come from student profile if stored
    hoursPerWeek: (publicData?.hoursPerWeek as number) || 20,
    applicationHistory: appHistory.map((a) => ({
      listingId: a.listing_id as string,
      status: a.status as string,
      category: a.category as string | null,
      skillsRequired: (a.skills_required || []) as string[],
      appliedAt: (a.created_at as Date).toISOString(),
    })),
    completionRate,
    onTimeRate: completionRate, // Simplified — same as completion for now
    avgRating: ratingStats?.avg_rating ? Number(ratingStats.avg_rating) : null,
    ratingCount: Number(ratingStats?.count || 0),
    activeConcurrentListings: Number(concurrent?.count || 0),
    joinedAt: (user.created_at as Date).toISOString(),
    gpa: user.gpa as string | null,
  };
}

/**
 * Load listing data needed for scoring.
 */
async function loadListingData(listingId: string): Promise<ListingData | null> {
  const [row] = await sql`
    SELECT l.id, l.title, l.description, l.category, l.skills_required,
           l.hours_per_week, l.duration, l.start_date, l.end_date,
           l.remote_allowed, l.compensation, l.is_paid,
           l.tenant_id, l.author_id, l.published_at,
           l.max_students, l.students_accepted,
           u.company_name
    FROM listings l
    LEFT JOIN users u ON u.id = l.author_id
    WHERE l.id = ${listingId}
  `;
  if (!row) return null;

  return {
    id: row.id as string,
    title: row.title as string,
    description: ((row.description as string) || '').slice(0, 500),
    category: row.category as string | null,
    skillsRequired: (row.skills_required || []) as string[],
    hoursPerWeek: row.hours_per_week as number | null,
    duration: row.duration as string | null,
    startDate: row.start_date ? (row.start_date as Date).toISOString() : null,
    endDate: row.end_date ? (row.end_date as Date).toISOString() : null,
    remoteAllowed: row.remote_allowed as boolean,
    compensation: row.compensation as string | null,
    isPaid: row.is_paid as boolean,
    tenantId: row.tenant_id as string | null,
    authorId: row.author_id as string,
    companyName: row.company_name as string | null,
    publishedAt: row.published_at ? (row.published_at as Date).toISOString() : null,
    maxStudents: (row.max_students as number) || 1,
    studentsAccepted: (row.students_accepted as number) || 0,
  };
}

/**
 * Load athletic skill transfers for a student based on their sport.
 */
async function loadAthleticTransfers(studentId: string): Promise<AthleticTransferSkill[]> {
  // Get student's sport from their schedule
  const sportSchedules = await sql`
    SELECT DISTINCT sp.sport_name
    FROM student_schedules ss
    JOIN sport_seasons sp ON sp.id = ss.sport_season_id
    WHERE ss.user_id = ${studentId} AND ss.is_active = TRUE
  `;

  if (sportSchedules.length === 0) return [];

  const sportNames = sportSchedules.map((s) => s.sport_name as string);

  // Get all skill mappings for these sports
  const mappings = await sql`
    SELECT sport_name, position, professional_skill, transfer_strength,
           skill_category, description
    FROM athletic_skill_mappings
    WHERE sport_name = ANY(${sportNames})
    ORDER BY transfer_strength DESC
  `;

  return mappings.map((m) => ({
    professionalSkill: m.professional_skill as string,
    transferStrength: Number(m.transfer_strength),
    sourceSport: m.sport_name as string,
    sourcePosition: m.position as string | null,
    skillCategory: m.skill_category as string,
  }));
}
