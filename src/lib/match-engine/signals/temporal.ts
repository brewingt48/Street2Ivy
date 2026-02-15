/**
 * ProveGround Match Engine™ — Temporal Fit Signal (25%)
 *
 * Scores the schedule overlap between a student's availability windows
 * and a listing's dates/requirements.
 *
 * Factors:
 *  - Sport season conflicts (in-season vs offseason)
 *  - Academic calendar (classes vs breaks)
 *  - Custom schedule blocks
 *  - Travel day conflicts
 *  - Available hours vs required hours
 */

import type { SignalResult, StudentData, ListingData } from '../types';

/**
 * Pure function — no DB calls.
 */
export function scoreTemporalFit(
  student: StudentData,
  listing: ListingData
): SignalResult {
  const details: Record<string, unknown> = {};
  let totalScore = 0;
  let factorCount = 0;

  // --- Factor 1: Hours availability match ---
  const requiredHours = listing.hoursPerWeek || 15;
  const availableHours = student.hoursPerWeek || 20;
  const hoursDiff = Math.abs(availableHours - requiredHours);

  let hoursScore: number;
  if (availableHours >= requiredHours) {
    // Student can handle the workload
    hoursScore = hoursDiff <= 5 ? 100 : hoursDiff <= 10 ? 85 : hoursDiff <= 20 ? 70 : 60;
  } else {
    // Student doesn't have enough hours — penalty
    hoursScore = hoursDiff <= 3 ? 75 : hoursDiff <= 8 ? 50 : hoursDiff <= 15 ? 25 : 10;
  }
  details.hoursScore = hoursScore;
  details.availableHours = availableHours;
  details.requiredHours = requiredHours;
  totalScore += hoursScore;
  factorCount++;

  // --- Factor 2: Sport season conflict ---
  const activeSchedules = student.schedules.filter((s) => s.isActive);
  const sportSchedules = activeSchedules.filter((s) => s.scheduleType === 'sport');

  if (sportSchedules.length > 0 && listing.startDate) {
    const listingStart = new Date(listing.startDate);
    const listingStartMonth = listingStart.getMonth() + 1; // 1-indexed

    let seasonConflictScore = 100;
    for (const sched of sportSchedules) {
      if (sched.startMonth && sched.endMonth) {
        const inSeason = isMonthInRange(listingStartMonth, sched.startMonth, sched.endMonth);
        if (inSeason) {
          // In-season — reduce score based on intensity
          const intensity = sched.intensityLevel || 3;
          const totalSportHours = (sched.practiceHoursPerWeek || 0) + (sched.competitionHoursPerWeek || 0);
          const loadFactor = Math.min(totalSportHours / 30, 1); // 30 hrs/week = max load
          seasonConflictScore = Math.max(
            20,
            100 - intensity * 12 - loadFactor * 20
          );
        }
      }
    }
    details.seasonConflictScore = seasonConflictScore;
    totalScore += seasonConflictScore;
    factorCount++;
  }

  // --- Factor 3: Travel day conflicts ---
  if (sportSchedules.length > 0) {
    const totalTravelDays = sportSchedules.reduce(
      (sum, s) => sum + (s.travelDaysPerMonth || 0),
      0
    );
    // More travel = harder to commit. 0-2 days = fine, 8+ = significant conflict
    const travelScore = totalTravelDays <= 2 ? 100 : totalTravelDays <= 4 ? 85 : totalTravelDays <= 6 ? 65 : totalTravelDays <= 8 ? 45 : 25;
    details.travelScore = travelScore;
    details.travelDaysPerMonth = totalTravelDays;
    totalScore += travelScore;
    factorCount++;
  }

  // --- Factor 4: Specific travel conflict overlap ---
  if (listing.startDate && listing.endDate) {
    const listingStart = new Date(listing.startDate).getTime();
    const listingEnd = new Date(listing.endDate).getTime();
    let conflictDays = 0;

    for (const sched of activeSchedules) {
      for (const tc of sched.travelConflicts || []) {
        const tcStart = new Date(tc.startDate).getTime();
        const tcEnd = new Date(tc.endDate).getTime();
        const overlap = Math.max(
          0,
          Math.min(listingEnd, tcEnd) - Math.max(listingStart, tcStart)
        );
        conflictDays += overlap / (1000 * 60 * 60 * 24);
      }
    }

    if (conflictDays > 0) {
      const listingDuration = (listingEnd - listingStart) / (1000 * 60 * 60 * 24);
      const conflictRatio = listingDuration > 0 ? conflictDays / listingDuration : 0;
      const conflictScore = Math.max(10, 100 - conflictRatio * 200);
      details.travelConflictDays = Math.round(conflictDays * 10) / 10;
      details.travelConflictScore = Math.round(conflictScore);
      totalScore += conflictScore;
      factorCount++;
    }
  }

  // --- Factor 5: Academic calendar alignment ---
  const academicSchedules = activeSchedules.filter((s) => s.scheduleType === 'academic');
  if (academicSchedules.length > 0 && listing.startDate) {
    // During breaks = higher availability, during classes = lower
    // This is a simplified check — real implementation could use exact dates
    let academicScore = 70; // neutral default
    for (const sched of academicSchedules) {
      if (sched.effectiveStart && sched.effectiveEnd) {
        const schedStart = new Date(sched.effectiveStart).getTime();
        const schedEnd = new Date(sched.effectiveEnd).getTime();
        const listStart = new Date(listing.startDate).getTime();
        if (listStart >= schedStart && listStart <= schedEnd) {
          // Listing starts during this academic period
          // Low priority (breaks) = higher score
          const priority = sched.intensityLevel || 3;
          academicScore = priority <= 2 ? 95 : priority <= 3 ? 70 : priority <= 4 ? 50 : 30;
        }
      }
    }
    details.academicScore = academicScore;
    totalScore += academicScore;
    factorCount++;
  }

  // --- Composite ---
  const finalScore = factorCount > 0 ? Math.round(totalScore / factorCount) : 50;

  return {
    signal: 'temporal',
    score: Math.min(100, Math.max(0, finalScore)),
    details,
  };
}

/**
 * Check if a month falls within a range (handles wrap-around, e.g., Oct-Feb)
 */
function isMonthInRange(month: number, start: number, end: number): boolean {
  if (start <= end) {
    return month >= start && month <= end;
  }
  // Wraps around year boundary (e.g., start=10, end=2 means Oct through Feb)
  return month >= start || month <= end;
}
