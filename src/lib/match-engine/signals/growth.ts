/**
 * ProveGround Match Engine™ — Growth Trajectory Signal (10%)
 *
 * Evaluates how well a listing aligns with a student's growth path.
 * A slight stretch (some missing skills) is actually beneficial.
 *
 * Factors:
 *  - Skill gap analysis (sweet spot: 20-40% new skills)
 *  - Category progression from application history
 *  - Challenge level match
 *  - GPA as proxy for academic capacity
 */

import type { SignalResult, StudentData, ListingData } from '../types';

/** Sweet spot: student should be missing 20-40% of skills for growth */
const IDEAL_GAP_MIN = 0.15;
const IDEAL_GAP_MAX = 0.45;

export function scoreGrowthTrajectory(
  student: StudentData,
  listing: ListingData
): SignalResult {
  const details: Record<string, unknown> = {};

  // --- Factor 1: Skill gap sweet spot ---
  const requiredSkills = (listing.skillsRequired || []).map((s) => s.toLowerCase().trim());
  const studentSkillNames = new Set(
    student.skills.map((s) => s.name.toLowerCase().trim())
  );

  let gapScore = 50; // neutral default
  if (requiredSkills.length > 0) {
    const matchedCount = requiredSkills.filter((s) => studentSkillNames.has(s)).length;
    const gapRatio = 1 - matchedCount / requiredSkills.length;

    if (gapRatio >= IDEAL_GAP_MIN && gapRatio <= IDEAL_GAP_MAX) {
      // Sweet spot — student will learn new things without being overwhelmed
      gapScore = 100;
    } else if (gapRatio < IDEAL_GAP_MIN) {
      // Too easy — student already knows almost everything
      gapScore = 60 + gapRatio * 200; // 60-90 range
    } else if (gapRatio <= 0.6) {
      // Moderate stretch — still doable
      gapScore = Math.round(80 - (gapRatio - IDEAL_GAP_MAX) * 150);
    } else {
      // Too big a gap — student is underqualified
      gapScore = Math.max(10, Math.round(50 - (gapRatio - 0.6) * 100));
    }

    details.gapRatio = Math.round(gapRatio * 100) / 100;
    details.matchedSkillCount = matchedCount;
    details.totalRequired = requiredSkills.length;
  }
  details.gapScore = gapScore;

  // --- Factor 2: Category progression ---
  // Has the student been working in this category? Moving up or diversifying?
  let progressionScore = 50;
  const history = student.applicationHistory || [];

  if (history.length > 0 && listing.category) {
    const categoryHistory = history.filter(
      (h) => h.category?.toLowerCase() === listing.category?.toLowerCase()
    );
    const completedInCategory = categoryHistory.filter(
      (h) => h.status === 'completed' || h.status === 'accepted'
    ).length;

    if (completedInCategory === 0 && categoryHistory.length === 0) {
      // New category — growth opportunity
      progressionScore = 80;
    } else if (completedInCategory === 0) {
      // Applied but never completed — neutral
      progressionScore = 55;
    } else if (completedInCategory <= 2) {
      // Some experience — building depth
      progressionScore = 90;
    } else {
      // Very experienced — less growth, maybe time to branch out
      progressionScore = 60;
    }
  }
  details.progressionScore = progressionScore;

  // --- Factor 3: GPA capacity proxy ---
  let capacityScore = 65; // neutral default
  if (student.gpa) {
    const gpa = parseFloat(student.gpa);
    if (!isNaN(gpa)) {
      if (gpa >= 3.5) {
        capacityScore = 95; // Strong academic capacity
      } else if (gpa >= 3.0) {
        capacityScore = 80;
      } else if (gpa >= 2.5) {
        capacityScore = 60;
      } else {
        capacityScore = 40; // May struggle with additional workload
      }
    }
  }
  details.capacityScore = capacityScore;

  // --- Weighted composite ---
  // Gap: 50%, Progression: 30%, Capacity: 20%
  const finalScore = Math.round(
    gapScore * 0.50 +
    progressionScore * 0.30 +
    capacityScore * 0.20
  );

  return {
    signal: 'growth',
    score: Math.min(100, Math.max(0, finalScore)),
    details,
  };
}
