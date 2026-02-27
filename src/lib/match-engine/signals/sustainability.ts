/**
 * ProveGround Match Engine™ — Sustainability Signal (15%)
 *
 * Evaluates workload balance and burnout risk.
 *
 * Factors:
 *  - Total committed hours vs available hours
 *  - Concurrent active listing count
 *  - Sport season intensity overlap
 *  - Academic load factor
 */

import type { SignalResult, StudentData, ListingData } from '../types';

/** Maximum reasonable hours per week before burnout risk */
const MAX_SUSTAINABLE_HOURS = 50;

/** Ideal concurrent project count */
const IDEAL_CONCURRENT = 1;

/** Max concurrent before heavy penalty */
const MAX_CONCURRENT = 3;

export function scoreSustainability(
  student: StudentData,
  listing: ListingData
): SignalResult {
  const details: Record<string, unknown> = {};

  // --- Factor 1: Workload balance ---
  const listingHours = listing.hoursPerWeek || 15;
  const sportHours = calculateSportHours(student);
  const existingProjectHours = student.activeConcurrentListings * 10; // rough estimate
  const totalCommittedHours = sportHours + existingProjectHours + listingHours;

  let workloadScore: number;
  if (totalCommittedHours <= 30) {
    workloadScore = 100; // Very manageable
  } else if (totalCommittedHours <= 40) {
    workloadScore = 85; // Busy but sustainable
  } else if (totalCommittedHours <= MAX_SUSTAINABLE_HOURS) {
    workloadScore = 65; // Getting heavy
  } else {
    // Over 50 hours — burnout risk
    const overload = totalCommittedHours - MAX_SUSTAINABLE_HOURS;
    workloadScore = Math.max(10, 50 - overload * 3);
  }

  details.workloadScore = workloadScore;
  details.totalCommittedHours = totalCommittedHours;
  details.sportHours = sportHours;
  details.existingProjectHours = existingProjectHours;
  details.listingHours = listingHours;

  // --- Factor 2: Concurrent listing count ---
  const concurrent = student.activeConcurrentListings;
  let concurrentScore: number;
  if (concurrent <= IDEAL_CONCURRENT) {
    concurrentScore = 100;
  } else if (concurrent <= 2) {
    concurrentScore = 75;
  } else if (concurrent <= MAX_CONCURRENT) {
    concurrentScore = 50;
  } else {
    concurrentScore = Math.max(10, 40 - (concurrent - MAX_CONCURRENT) * 15);
  }

  details.concurrentScore = concurrentScore;
  details.concurrentListings = concurrent;

  // --- Factor 3: Sport season intensity ---
  const activeSeasons = student.schedules.filter(
    (s) => s.isActive && s.scheduleType === 'sport'
  );
  let intensityScore = 100;
  if (activeSeasons.length > 0) {
    const maxIntensity = Math.max(...activeSeasons.map((s) => s.intensityLevel));
    // High intensity sport season + project = sustainability risk
    intensityScore = maxIntensity <= 2 ? 90 : maxIntensity <= 3 ? 70 : maxIntensity <= 4 ? 45 : 25;
  }

  details.intensityScore = intensityScore;

  // --- Weighted composite ---
  // Workload: 50%, Concurrent: 30%, Intensity: 20%
  const finalScore = Math.round(
    workloadScore * 0.50 +
    concurrentScore * 0.30 +
    intensityScore * 0.20
  );

  return {
    signal: 'sustainability',
    score: Math.min(100, Math.max(0, finalScore)),
    details,
  };
}

/**
 * Calculate total sport-related hours per week from active schedules
 */
function calculateSportHours(student: StudentData): number {
  const activeSeasons = student.schedules.filter(
    (s) => s.isActive && s.scheduleType === 'sport'
  );
  return activeSeasons.reduce(
    (sum, s) => sum + (s.practiceHoursPerWeek || 0) + (s.competitionHoursPerWeek || 0),
    0
  );
}
