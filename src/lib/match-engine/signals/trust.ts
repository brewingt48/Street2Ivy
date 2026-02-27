/**
 * ProveGround Match Engine™ — Trust / Reliability Signal (10%)
 *
 * Evaluates the student's track record of reliability.
 *
 * Factors:
 *  - Past completion rate (completed / accepted)
 *  - On-time delivery rate
 *  - Ratings received from corporate partners
 *  - Time on platform (tenure)
 *  - New user bonus (don't penalize new users)
 */

import type { SignalResult, StudentData } from '../types';

/** Minimum applications before trust can be fully assessed */
const MIN_HISTORY_THRESHOLD = 3;

/** Maximum tenure bonus (in days) */
const MAX_TENURE_DAYS = 365;

export function scoreTrustReliability(
  student: StudentData
): SignalResult {
  const details: Record<string, unknown> = {};
  const history = student.applicationHistory || [];

  // --- New user handling ---
  if (history.length === 0) {
    // No history — give a neutral-positive score (benefit of the doubt)
    return {
      signal: 'trust',
      score: 55,
      details: {
        isNewUser: true,
        completionScore: 55,
        ratingScore: 55,
        tenureScore: 30,
        note: 'New user — no history to evaluate',
      },
    };
  }

  // --- Factor 1: Completion rate ---
  const accepted = history.filter(
    (h) => h.status === 'accepted' || h.status === 'completed'
  );
  const completed = history.filter((h) => h.status === 'completed');

  let completionScore = 55; // default
  if (accepted.length >= MIN_HISTORY_THRESHOLD) {
    const completionRate = student.completionRate;
    if (completionRate >= 0.9) {
      completionScore = 100;
    } else if (completionRate >= 0.75) {
      completionScore = 85;
    } else if (completionRate >= 0.5) {
      completionScore = 65;
    } else {
      completionScore = 35;
    }
  } else if (accepted.length > 0) {
    // Small sample — slight benefit of the doubt
    completionScore = completed.length > 0 ? 75 : 50;
  }

  details.completionScore = completionScore;
  details.completionRate = student.completionRate;
  details.totalAccepted = accepted.length;
  details.totalCompleted = completed.length;

  // --- Factor 2: On-time delivery ---
  let onTimeScore = 60; // neutral default
  if (student.onTimeRate > 0) {
    if (student.onTimeRate >= 0.9) {
      onTimeScore = 100;
    } else if (student.onTimeRate >= 0.75) {
      onTimeScore = 80;
    } else if (student.onTimeRate >= 0.5) {
      onTimeScore = 55;
    } else {
      onTimeScore = 30;
    }
  }
  details.onTimeScore = onTimeScore;
  details.onTimeRate = student.onTimeRate;

  // --- Factor 3: Ratings from corporate partners ---
  let ratingScore = 55; // neutral default
  if (student.avgRating !== null && student.ratingCount > 0) {
    // Ratings are 1-5 scale
    if (student.avgRating >= 4.5) {
      ratingScore = 100;
    } else if (student.avgRating >= 4.0) {
      ratingScore = 85;
    } else if (student.avgRating >= 3.5) {
      ratingScore = 70;
    } else if (student.avgRating >= 3.0) {
      ratingScore = 50;
    } else {
      ratingScore = 25;
    }

    // Small sample penalty
    if (student.ratingCount < 3) {
      ratingScore = Math.round(ratingScore * 0.85 + 55 * 0.15); // regress toward mean
    }
  }
  details.ratingScore = ratingScore;
  details.avgRating = student.avgRating;
  details.ratingCount = student.ratingCount;

  // --- Factor 4: Platform tenure ---
  const daysSinceJoined = student.joinedAt
    ? (Date.now() - new Date(student.joinedAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const tenureFactor = Math.min(daysSinceJoined / MAX_TENURE_DAYS, 1);
  const tenureScore = Math.round(30 + tenureFactor * 40); // 30-70 range

  details.tenureScore = tenureScore;
  details.daysSinceJoined = Math.round(daysSinceJoined);

  // --- Weighted composite ---
  // Completion: 35%, On-time: 25%, Ratings: 25%, Tenure: 15%
  const finalScore = Math.round(
    completionScore * 0.35 +
    onTimeScore * 0.25 +
    ratingScore * 0.25 +
    tenureScore * 0.15
  );

  return {
    signal: 'trust',
    score: Math.min(100, Math.max(0, finalScore)),
    details,
  };
}
