/**
 * ProveGround Match Engine™ — Skills Alignment Signal (30%)
 *
 * Weighted Jaccard similarity with proficiency matching and
 * athletic skill transfers.
 *
 * Factors:
 *  - Direct skill matches (exact name match)
 *  - Proficiency level alignment (student prof vs implied requirement)
 *  - Athletic skill transfers (sport/position → professional skill, weighted by transfer_strength)
 *  - Skill category overlap (broader category alignment)
 */

import type {
  SignalResult,
  StudentData,
  ListingData,
  AthleticTransferSkill,
} from '../types';

export interface SkillsSignalDetails {
  directMatchCount: number;
  totalRequired: number;
  directMatchScore: number;
  proficiencyScore: number;
  transferScore: number;
  categoryScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  athleticTransferSkills: AthleticTransferSkill[];
}

/**
 * Pure function — no DB calls.
 * Athletic transfer skills are passed in (pre-loaded from DB).
 */
export function scoreSkillsAlignment(
  student: StudentData,
  listing: ListingData,
  athleticTransfers: AthleticTransferSkill[]
): SignalResult {
  const requiredSkills = (listing.skillsRequired || []).map((s) => s.toLowerCase().trim());
  const studentSkillMap = new Map(
    student.skills.map((s) => [s.name.toLowerCase().trim(), s])
  );

  // If no skills required, give a moderate base score
  if (requiredSkills.length === 0) {
    return {
      signal: 'skills',
      score: studentSkillMap.size > 0 ? 50 : 30,
      details: {
        directMatchCount: 0,
        totalRequired: 0,
        directMatchScore: 50,
        proficiencyScore: 50,
        transferScore: 0,
        categoryScore: 50,
        matchedSkills: [],
        missingSkills: [],
        athleticTransferSkills: [],
      },
    };
  }

  // --- Direct matches ---
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let proficiencySum = 0;
  let proficiencyCount = 0;

  for (const req of requiredSkills) {
    const studentSkill = studentSkillMap.get(req);
    if (studentSkill) {
      matchedSkills.push(req);
      // Proficiency scoring: 3 = meets expectations, 4-5 = exceeds, 1-2 = below
      const profScore = Math.min(100, (studentSkill.proficiencyLevel / 3) * 70);
      proficiencySum += profScore;
      proficiencyCount++;
    } else {
      missingSkills.push(req);
    }
  }

  const directMatchRatio = matchedSkills.length / requiredSkills.length;
  const directMatchScore = Math.round(directMatchRatio * 100);

  // Proficiency score — average proficiency of matched skills
  const proficiencyScore = proficiencyCount > 0
    ? Math.round(proficiencySum / proficiencyCount)
    : 0;

  // --- Athletic transfer matches ---
  // For missing skills, check if the student's sport/position transfers to them
  const transferMatches: AthleticTransferSkill[] = [];
  let transferScore = 0;

  if (athleticTransfers.length > 0) {
    const transferMap = new Map<string, AthleticTransferSkill>();
    for (const at of athleticTransfers) {
      const key = at.professionalSkill.toLowerCase().trim();
      // Keep the strongest transfer if multiple entries
      const existing = transferMap.get(key);
      if (!existing || at.transferStrength > existing.transferStrength) {
        transferMap.set(key, at);
      }
    }

    for (const missing of missingSkills) {
      const transfer = transferMap.get(missing);
      if (transfer) {
        transferMatches.push(transfer);
      }
    }

    if (transferMatches.length > 0) {
      // Transfer contributes a fraction of a direct match, weighted by transfer_strength
      const transferContribution = transferMatches.reduce(
        (sum, t) => sum + t.transferStrength,
        0
      );
      const adjustedMatchRatio =
        (matchedSkills.length + transferContribution) / requiredSkills.length;
      transferScore = Math.round(
        Math.min(1, transferContribution / missingSkills.length) * 60
      );
      // Boost the direct match score slightly based on transfers
      const boostedDirectScore = Math.round(Math.min(100, adjustedMatchRatio * 100));
      // We'll use the boosted score in the final calculation
      (directMatchScore as number); // keep original for details
    }
  }

  // --- Category overlap ---
  // Even if specific skills don't match, overlapping categories suggest general fit
  const studentCategories = new Set(
    student.skills.map((s) => s.category.toLowerCase().trim())
  );
  const requiredCategoriesFromTransfers = new Set(
    athleticTransfers.map((t) => t.skillCategory.toLowerCase().trim())
  );
  // Rough estimate: any skill category overlap is a positive signal
  const categoryOverlap = Array.from(studentCategories).filter((c) =>
    requiredCategoriesFromTransfers.has(c)
  ).length;
  const categoryScore = Math.min(100, categoryOverlap * 25 + 25);

  // --- Weighted composite ---
  // Direct match: 55%, Proficiency: 20%, Athletic transfer: 15%, Category: 10%
  const finalScore = Math.round(
    directMatchScore * 0.55 +
    proficiencyScore * 0.20 +
    transferScore * 0.15 +
    categoryScore * 0.10
  );

  return {
    signal: 'skills',
    score: Math.min(100, Math.max(0, finalScore)),
    details: {
      directMatchCount: matchedSkills.length,
      totalRequired: requiredSkills.length,
      directMatchScore,
      proficiencyScore,
      transferScore,
      categoryScore,
      matchedSkills,
      missingSkills,
      athleticTransferSkills: transferMatches,
    } as unknown as Record<string, unknown>,
  };
}
