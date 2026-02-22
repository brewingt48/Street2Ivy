/**
 * Portfolio Badge Engine
 *
 * Evaluates and awards badges based on student achievements.
 */

import { sql } from '@/lib/db';

interface BadgeAward {
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

async function awardBadge(
  studentId: string,
  type: string,
  label: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  // Check if badge already exists (idempotent)
  const existing = await sql`
    SELECT id FROM portfolio_badges
    WHERE student_id = ${studentId} AND badge_type = ${type} AND badge_label = ${label}
  `;
  if (existing.length > 0) return false;

  await sql`
    INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata)
    VALUES (${studentId}, ${type}, ${label}, ${JSON.stringify(metadata || {})}::jsonb)
  `;
  return true;
}

export async function evaluateAfterProjectCompletion(
  studentId: string,
  projectId: string
): Promise<BadgeAward[]> {
  const awarded: BadgeAward[] = [];

  // 1. Check for verified skills from this project
  const verifiedSkills = await sql`
    SELECT s.name FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ${studentId}
      AND us.project_id = ${projectId}
      AND us.verification_source = 'project_completion'
  `;
  for (const skill of verifiedSkills) {
    const badge: BadgeAward = {
      type: 'skill_verified',
      label: `Verified: ${skill.name}`,
      metadata: { skillName: skill.name as string, projectId },
    };
    if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
      awarded.push(badge);
    }
  }

  // 2. Count completed projects for milestones
  const countRows = await sql`
    SELECT COUNT(*) as count FROM project_applications
    WHERE student_id = ${studentId} AND status = 'completed'
  `;
  const completedCount = Number(countRows[0].count);

  const milestones = [
    { count: 1, label: 'First Project Completed' },
    { count: 5, label: '5 Projects Completed' },
    { count: 10, label: '10 Projects Completed' },
    { count: 25, label: '25 Projects Completed' },
  ];

  for (const milestone of milestones) {
    if (completedCount >= milestone.count) {
      const badge: BadgeAward = {
        type: 'project_milestone',
        label: milestone.label,
        metadata: { count: milestone.count },
      };
      if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
        awarded.push(badge);
      }
    }
  }

  // 3. First project badge
  if (completedCount >= 1) {
    const badge: BadgeAward = {
      type: 'first_project',
      label: 'First Project',
      metadata: { projectId },
    };
    if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
      awarded.push(badge);
    }
  }

  // 4. Check employer rating
  const ratingRows = await sql`
    SELECT AVG(rating) as avg_rating FROM student_ratings
    WHERE student_id = ${studentId}
  `;
  const avgRating = Number(ratingRows[0]?.avg_rating || 0);
  if (avgRating >= 4.5 && avgRating > 0) {
    const badge: BadgeAward = {
      type: 'top_performer',
      label: 'Top Performer',
      metadata: { avgRating },
    };
    if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
      awarded.push(badge);
    }
  }

  // 5. Check readiness scores
  const readinessRows = await sql`
    SELECT overall_readiness_score FROM skill_gap_snapshots
    WHERE student_id = ${studentId}
    ORDER BY snapshot_date DESC
    LIMIT 1
  `;
  if (readinessRows.length > 0) {
    const score = Number(readinessRows[0].overall_readiness_score);
    if (score >= 76) {
      const badge: BadgeAward = {
        type: 'hire_ready',
        label: 'Hire Ready',
        metadata: { score },
      };
      if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
        awarded.push(badge);
      }
    }
  }

  return awarded;
}

export async function evaluateStreaks(studentId: string): Promise<BadgeAward[]> {
  const awarded: BadgeAward[] = [];

  // Get completion dates grouped by month
  const completions = await sql`
    SELECT DISTINCT DATE_TRUNC('month', updated_at) as month
    FROM project_applications
    WHERE student_id = ${studentId} AND status = 'completed'
    ORDER BY month DESC
  `;

  if (completions.length < 3) return awarded;

  // Check for consecutive months
  let consecutive = 1;
  for (let i = 1; i < completions.length; i++) {
    const curr = new Date(completions[i].month as string);
    const prev = new Date(completions[i - 1].month as string);
    const diffMonths =
      (prev.getFullYear() - curr.getFullYear()) * 12 +
      (prev.getMonth() - curr.getMonth());
    if (diffMonths === 1) {
      consecutive++;
      if (consecutive >= 3) {
        const badge: BadgeAward = {
          type: 'streak',
          label: `${consecutive}-Month Streak`,
          metadata: { months: consecutive },
        };
        if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
          awarded.push(badge);
        }
      }
    } else {
      consecutive = 1;
    }
  }

  return awarded;
}

export async function evaluateEndorsement(
  studentId: string,
  employerId: string
): Promise<BadgeAward[]> {
  const awarded: BadgeAward[] = [];

  const employerRows = await sql`
    SELECT first_name, last_name, company_name FROM users WHERE id = ${employerId}
  `;
  if (employerRows.length === 0) return awarded;

  const employer = employerRows[0];
  const companyName =
    (employer.company_name as string) || `${employer.first_name} ${employer.last_name}`;

  const badge: BadgeAward = {
    type: 'employer_endorsed',
    label: `Endorsed by ${companyName}`,
    metadata: { employerId, companyName },
  };
  if (await awardBadge(studentId, badge.type, badge.label, badge.metadata)) {
    awarded.push(badge);
  }

  return awarded;
}
