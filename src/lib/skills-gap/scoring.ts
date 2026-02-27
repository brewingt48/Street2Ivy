/**
 * Skills Gap Scoring Utilities
 *
 * Weighted scoring algorithm for readiness assessment.
 */

export const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'beginner',
  2: 'intermediate',
  3: 'advanced',
  4: 'expert',
  5: 'expert',
};

export const IMPORTANCE_MULTIPLIERS: Record<string, number> = {
  required: 3,
  preferred: 2,
  nice_to_have: 1,
};

export const READINESS_TIERS = [
  { min: 0, max: 25, label: 'Exploring' },
  { min: 26, max: 50, label: 'Building' },
  { min: 51, max: 75, label: 'Demonstrating' },
  { min: 76, max: 100, label: 'Hire-Ready' },
] as const;

export type ReadinessTier = (typeof READINESS_TIERS)[number]['label'];

export function getReadinessTier(score: number): ReadinessTier {
  for (const tier of READINESS_TIERS) {
    if (score >= tier.min && score <= tier.max) {
      return tier.label;
    }
  }
  return 'Exploring';
}

interface SkillRequirement {
  skillId: string;
  importance: string;
  minimumProficiency: number;
}

/**
 * Calculate overall readiness score as a weighted percentage.
 *
 * For each requirement, score = min(studentLevel / requiredLevel, 1.0) * importanceWeight
 * Total = sum(scores) / sum(maxPossibleScores) * 100
 */
export function calculateReadinessScore(
  requirements: SkillRequirement[],
  studentSkillsMap: Map<string, number>
): number {
  if (requirements.length === 0) return 0;

  let weightedScore = 0;
  let maxPossibleScore = 0;

  for (const req of requirements) {
    const weight = IMPORTANCE_MULTIPLIERS[req.importance] ?? 1;
    const studentLevel = studentSkillsMap.get(req.skillId) ?? 0;
    const ratio = Math.min(studentLevel / req.minimumProficiency, 1.0);

    weightedScore += ratio * weight;
    maxPossibleScore += weight;
  }

  if (maxPossibleScore === 0) return 0;
  return Math.round((weightedScore / maxPossibleScore) * 100);
}
