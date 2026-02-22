/**
 * Skills Gap Analyzer Service
 *
 * Analyzes student skills against target role requirements.
 */

import { sql } from '@/lib/db';
import { calculateReadinessScore, getReadinessTier } from './scoring';

export interface GapItem {
  skillId: string;
  skillName: string;
  category: string;
  requiredLevel: number;
  currentLevel: number;
  gapSeverity: string;
  importance: string;
  verificationSource: string;
  recommendedProjects: Array<{ id: string; title: string }>;
}

export interface StrengthItem {
  skillId: string;
  skillName: string;
  category: string;
  verifiedLevel: number;
  exceedsBy: number;
  verificationSource: string;
}

export interface GapAnalysisResult {
  studentId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  overallReadinessScore: number;
  readinessTier: string;
  gaps: GapItem[];
  strengths: StrengthItem[];
  snapshotId: string;
}

function getGapSeverity(gap: number): string {
  if (gap >= 3) return 'critical';
  if (gap >= 2) return 'significant';
  if (gap >= 1) return 'minor';
  return 'none';
}

/**
 * Analyze a student's skills against a target role.
 */
export async function analyzeStudentGaps(
  studentId: string,
  targetRoleId: string
): Promise<GapAnalysisResult> {
  // 1. Fetch target role info
  const roleRows = await sql`
    SELECT id, title FROM target_roles WHERE id = ${targetRoleId}
  `;
  if (roleRows.length === 0) {
    throw new Error('Target role not found');
  }
  const role = roleRows[0];

  // 2. Fetch student's skills (including verification source)
  const studentSkillRows = await sql`
    SELECT us.skill_id, us.proficiency_level, us.verification_source, s.name, s.category
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ${studentId}
  `;

  const studentSkillsMap = new Map<string, number>();
  const studentSkillVerification = new Map<string, string>();
  for (const row of studentSkillRows) {
    const level = Number(row.proficiency_level) || 0;
    studentSkillsMap.set(row.skill_id as string, level);
    studentSkillVerification.set(row.skill_id as string, (row.verification_source as string) || 'self_reported');
  }

  // 3. Fetch role requirements
  const requirementRows = await sql`
    SELECT rsr.skill_id, rsr.importance, rsr.minimum_proficiency, s.name, s.category
    FROM role_skill_requirements rsr
    JOIN skills s ON s.id = rsr.skill_id
    WHERE rsr.target_role_id = ${targetRoleId}
  `;

  const requirements = requirementRows.map((r) => ({
    skillId: r.skill_id as string,
    importance: r.importance as string,
    minimumProficiency: Number(r.minimum_proficiency),
  }));

  // 4. Compute score
  const score = calculateReadinessScore(requirements, studentSkillsMap);
  const tier = getReadinessTier(score);

  // 5. Build gaps and strengths
  const gaps: GapItem[] = [];
  const strengths: StrengthItem[] = [];

  for (const req of requirementRows) {
    const skillId = req.skill_id as string;
    const reqLevel = Number(req.minimum_proficiency);
    const currentLevel = studentSkillsMap.get(skillId) ?? 0;
    const diff = reqLevel - currentLevel;

    const verSource = studentSkillVerification.get(skillId) || 'self_reported';

    if (diff > 0) {
      gaps.push({
        skillId,
        skillName: req.name as string,
        category: req.category as string,
        requiredLevel: reqLevel,
        currentLevel,
        gapSeverity: getGapSeverity(diff),
        importance: req.importance as string,
        verificationSource: verSource,
        recommendedProjects: [],
      });
    } else {
      strengths.push({
        skillId,
        skillName: req.name as string,
        category: req.category as string,
        verifiedLevel: currentLevel,
        exceedsBy: Math.abs(diff),
        verificationSource: verSource,
      });
    }
  }

  // 6. Fetch recommended projects for each gap skill
  for (const gap of gaps) {
    const projectRows = await sql`
      SELECT id, title FROM listings
      WHERE status = 'published'
        AND skills_required::jsonb @> ${JSON.stringify([gap.skillName])}::jsonb
      LIMIT 3
    `;
    gap.recommendedProjects = projectRows.map((p) => ({
      id: p.id as string,
      title: p.title as string,
    }));
  }

  // 7. Sort gaps by severity (critical first)
  const severityOrder: Record<string, number> = { critical: 0, significant: 1, minor: 2, none: 3 };
  gaps.sort((a, b) => (severityOrder[a.gapSeverity] ?? 3) - (severityOrder[b.gapSeverity] ?? 3));

  // 8. Save snapshot
  const today = new Date().toISOString().split('T')[0];
  const snapshotGaps = gaps.map((g) => ({
    skillId: g.skillId,
    requiredLevel: g.requiredLevel,
    currentLevel: g.currentLevel,
    gapSeverity: g.gapSeverity,
    recommendedProjects: g.recommendedProjects.map((p) => p.id),
  }));
  const snapshotStrengths = strengths.map((s) => ({
    skillId: s.skillId,
    verifiedLevel: s.verifiedLevel,
    exceedsBy: s.exceedsBy,
  }));

  const snapshotRows = await sql`
    INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
    VALUES (
      ${studentId},
      ${targetRoleId},
      ${score},
      ${JSON.stringify(snapshotGaps)}::jsonb,
      ${JSON.stringify(snapshotStrengths)}::jsonb,
      ${today}
    )
    RETURNING id
  `;

  return {
    studentId,
    targetRoleId,
    targetRoleTitle: role.title as string,
    overallReadinessScore: score,
    readinessTier: tier,
    gaps,
    strengths,
    snapshotId: snapshotRows[0].id as string,
  };
}

/**
 * Aggregate skills gap data across all students in an institution.
 */
export async function aggregateInstitutionGaps(
  institutionId: string,
  _filters?: { program?: string; cohort?: string; graduationYear?: string }
): Promise<{
  totalStudents: number;
  averageReadiness: number;
  readinessDistribution: Array<{ tier: string; count: number; percentage: number }>;
  topGaps: Array<{ skillName: string; category: string; studentCount: number; avgGapSeverity: string }>;
  topStrengths: Array<{ skillName: string; category: string; studentCount: number; avgLevel: number }>;
}> {
  // Fetch all students for the institution (users table uses tenant_id)
  const studentRows = await sql`
    SELECT id FROM users
    WHERE tenant_id = ${institutionId}
      AND role = 'student'
  `;

  const studentIds = studentRows.map((r) => r.id as string);

  if (studentIds.length === 0) {
    return {
      totalStudents: 0,
      averageReadiness: 0,
      readinessDistribution: [],
      topGaps: [],
      topStrengths: [],
    };
  }

  // Get most recent snapshots for each student
  const snapshotRows = await sql`
    SELECT DISTINCT ON (student_id) student_id, overall_readiness_score, gaps, strengths
    FROM skill_gap_snapshots
    WHERE student_id = ANY(${studentIds}::uuid[])
    ORDER BY student_id, snapshot_date DESC
  `;

  // Compute readiness distribution
  const tierCounts: Record<string, number> = {
    Exploring: 0,
    Building: 0,
    Demonstrating: 0,
    'Hire-Ready': 0,
  };
  let totalScore = 0;

  for (const row of snapshotRows) {
    const score = Number(row.overall_readiness_score);
    totalScore += score;
    const tier = getReadinessTier(score);
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  const totalWithSnapshots = snapshotRows.length;
  const readinessDistribution = Object.entries(tierCounts).map(([tier, count]) => ({
    tier,
    count,
    percentage: totalWithSnapshots > 0 ? Math.round((count / totalWithSnapshots) * 100) : 0,
  }));

  // Aggregate top gaps across all students
  const gapCounts = new Map<
    string,
    { skillName: string; category: string; count: number; severities: string[] }
  >();
  const strengthCounts = new Map<
    string,
    { skillName: string; category: string; count: number; levels: number[] }
  >();

  for (const row of snapshotRows) {
    const gaps = (row.gaps || []) as Array<{ skillId: string; gapSeverity: string }>;
    const rowStrengths = (row.strengths || []) as Array<{
      skillId: string;
      verifiedLevel: number;
    }>;

    for (const gap of gaps) {
      const existing = gapCounts.get(gap.skillId);
      if (existing) {
        existing.count++;
        existing.severities.push(gap.gapSeverity);
      } else {
        gapCounts.set(gap.skillId, {
          skillName: '',
          category: '',
          count: 1,
          severities: [gap.gapSeverity],
        });
      }
    }

    for (const strength of rowStrengths) {
      const existing = strengthCounts.get(strength.skillId);
      if (existing) {
        existing.count++;
        existing.levels.push(strength.verifiedLevel);
      } else {
        strengthCounts.set(strength.skillId, {
          skillName: '',
          category: '',
          count: 1,
          levels: [strength.verifiedLevel],
        });
      }
    }
  }

  // Fetch skill names for all referenced skills
  const gapKeyArr = Array.from(gapCounts.keys());
  const strengthKeyArr = Array.from(strengthCounts.keys());
  const allSkillIds = Array.from(new Set(gapKeyArr.concat(strengthKeyArr)));
  if (allSkillIds.length > 0) {
    const skillRows = await sql`
      SELECT id, name, category FROM skills WHERE id = ANY(${allSkillIds}::uuid[])
    `;
    for (const row of skillRows) {
      const id = row.id as string;
      const gapEntry = gapCounts.get(id);
      if (gapEntry) {
        gapEntry.skillName = row.name as string;
        gapEntry.category = row.category as string;
      }
      const strengthEntry = strengthCounts.get(id);
      if (strengthEntry) {
        strengthEntry.skillName = row.name as string;
        strengthEntry.category = row.category as string;
      }
    }
  }

  // Build sorted top lists
  const topGaps = Array.from(gapCounts.values())
    .filter((g) => g.skillName)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((g) => ({
      skillName: g.skillName,
      category: g.category,
      studentCount: g.count,
      avgGapSeverity: getMostCommonSeverity(g.severities),
    }));

  const topStrengths = Array.from(strengthCounts.values())
    .filter((s) => s.skillName)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => ({
      skillName: s.skillName,
      category: s.category,
      studentCount: s.count,
      avgLevel:
        s.levels.length > 0
          ? Math.round((s.levels.reduce((acc: number, val: number) => acc + val, 0) / s.levels.length) * 10) / 10
          : 0,
    }));

  return {
    totalStudents: studentIds.length,
    averageReadiness: totalWithSnapshots > 0 ? Math.round(totalScore / totalWithSnapshots) : 0,
    readinessDistribution,
    topGaps,
    topStrengths,
  };
}

function getMostCommonSeverity(severities: string[]): string {
  const counts: Record<string, number> = {};
  for (const s of severities) {
    counts[s] = (counts[s] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'minor';
}

/**
 * Get recommended projects for a specific skill.
 */
export async function getRecommendedProjects(
  skillName: string,
  tenantId?: string
): Promise<Array<{ id: string; title: string; company: string }>> {
  const rows = tenantId
    ? await sql`
        SELECT l.id, l.title, u.company_name
        FROM listings l
        LEFT JOIN users u ON u.id = l.author_id
        WHERE l.status = 'published'
          AND l.tenant_id = ${tenantId}
          AND l.skills_required::jsonb @> ${JSON.stringify([skillName])}::jsonb
        LIMIT 5
      `
    : await sql`
        SELECT l.id, l.title, u.company_name
        FROM listings l
        LEFT JOIN users u ON u.id = l.author_id
        WHERE l.status = 'published'
          AND l.skills_required::jsonb @> ${JSON.stringify([skillName])}::jsonb
        LIMIT 5
      `;

  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    company: (r.company_name as string) || 'Unknown',
  }));
}
