/**
 * Coach Context Helper
 *
 * Generates skills gap context strings for AI coaching prompts.
 */

import { sql } from '@/lib/db';

/**
 * Get a formatted context string about a student's skills gap analysis
 * for inclusion in AI coaching system prompts.
 *
 * Returns null if no gap analysis exists for the student.
 */
export async function getStudentGapContext(studentId: string): Promise<string | null> {
  // Query latest skill_gap_snapshot for the student
  const snapshots = await sql`
    SELECT sgs.overall_readiness_score, sgs.gaps, sgs.strengths, sgs.snapshot_date,
           tr.title as role_title
    FROM skill_gap_snapshots sgs
    JOIN target_roles tr ON tr.id = sgs.target_role_id
    WHERE sgs.student_id = ${studentId}
    ORDER BY sgs.snapshot_date DESC
    LIMIT 1
  `;

  if (snapshots.length === 0) return null;

  const snapshot = snapshots[0];
  const score = Number(snapshot.overall_readiness_score);
  const roleTitle = snapshot.role_title as string;
  const gaps = (snapshot.gaps || []) as Array<{ skillId: string; requiredLevel: number; currentLevel: number; gapSeverity: string }>;
  const strengths = (snapshot.strengths || []) as Array<{ skillId: string; verifiedLevel: number; exceedsBy: number }>;

  // Get skill names for top gaps and strengths
  const gapSkillIds = gaps.slice(0, 5).map(g => g.skillId);
  const strengthSkillIds = strengths.slice(0, 5).map(s => s.skillId);
  const allSkillIds = [...gapSkillIds, ...strengthSkillIds].filter(Boolean);

  if (allSkillIds.length === 0) {
    return `The student has a readiness score of ${score}/100 for the "${roleTitle}" career path.`;
  }

  // Fetch skill names
  const skillRows = await sql`SELECT id, name FROM skills WHERE id = ANY(${allSkillIds}::uuid[])`;
  const skillMap = new Map<string, string>();
  for (const row of skillRows) {
    skillMap.set(row.id as string, row.name as string);
  }

  const topGaps = gaps
    .slice(0, 3)
    .map(g => {
      const name = skillMap.get(g.skillId) || 'Unknown';
      return `${name} (${g.gapSeverity})`;
    })
    .join(', ');

  const topStrengths = strengths
    .slice(0, 3)
    .map(s => skillMap.get(s.skillId) || 'Unknown')
    .join(', ');

  const parts = [
    `## Skills Gap Analysis`,
    `The student has a readiness score of ${score}/100 for the "${roleTitle}" career path.`,
  ];

  if (topGaps) parts.push(`Top skill gaps: ${topGaps}.`);
  if (topStrengths) parts.push(`Key strengths: ${topStrengths}.`);
  parts.push(`Use this context to tailor advice toward closing their skill gaps and leveraging their strengths.`);

  return parts.join('\n');
}
