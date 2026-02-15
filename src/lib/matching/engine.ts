/**
 * Smart Matching Engine — Student ↔ Project Scoring
 *
 * Multi-factor scoring algorithm that learns from matching patterns:
 *
 * 1. SKILL MATCH (40%): Jaccard similarity of student skills vs required skills
 * 2. CATEGORY AFFINITY (20%): Learned from past applications — how often a student
 *    applies to / succeeds in a given category
 * 3. AVAILABILITY (15%): Does the student's hours/week fit the project?
 * 4. RECENCY BOOST (10%): Newer projects get a slight boost
 * 5. SUCCESS HISTORY (15%): Students who were accepted in similar projects score higher
 *
 * The engine uses application outcome data to weight category affinity and success
 * history, so it improves as more applications are processed.
 */

import { sql } from '@/lib/db';

export interface MatchScore {
  listingId: string;
  title: string;
  description: string;
  category: string | null;
  company: string | null;
  compensation: string | null;
  remoteAllowed: boolean;
  skillsRequired: string[];
  matchScore: number;
  matchBreakdown: {
    skillMatch: number;
    categoryAffinity: number;
    availability: number;
    recencyBoost: number;
    successHistory: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  publishedAt: string;
}

export interface StudentMatchScore {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string | null;
  gpa: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/**
 * Get recommended projects for a student, scored by match quality.
 * Learns from the student's application history to improve recommendations.
 */
export async function getRecommendedProjects(
  userId: string,
  limit = 10
): Promise<MatchScore[]> {
  // 1. Get student's skills
  const studentSkills = await sql`
    SELECT s.name, s.category
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ${userId}
  `;
  const studentSkillNames = new Set(
    studentSkills.map((s: Record<string, unknown>) => (s.name as string).toLowerCase())
  );
  const studentCategories = new Set(
    studentSkills.map((s: Record<string, unknown>) => s.category as string)
  );

  // 2. Get student's application history for learning
  const appHistory = await sql`
    SELECT pa.listing_id, pa.status, l.category, l.skills_required
    FROM project_applications pa
    JOIN listings l ON l.id = pa.listing_id
    WHERE pa.student_id = ${userId}
  `;

  // Learn category preferences from application history
  const categoryApplyCount: Record<string, number> = {};
  const categorySuccessCount: Record<string, number> = {};
  const appliedListingIds = new Set<string>();

  appHistory.forEach((a: Record<string, unknown>) => {
    const cat = (a.category as string) || 'General';
    categoryApplyCount[cat] = (categoryApplyCount[cat] || 0) + 1;
    if (a.status === 'accepted' || a.status === 'completed') {
      categorySuccessCount[cat] = (categorySuccessCount[cat] || 0) + 1;
    }
    appliedListingIds.add(a.listing_id as string);
  });

  // 2b. Get student's invite history (exclude declined/accepted invites from recommendations)
  const inviteHistory = await sql`
    SELECT listing_id, status
    FROM corporate_invites
    WHERE student_id = ${userId}
      AND status IN ('declined', 'accepted')
  `;
  const excludedInviteListingIds = new Set<string>();
  inviteHistory.forEach((i: Record<string, unknown>) => {
    if (i.listing_id) {
      excludedInviteListingIds.add(i.listing_id as string);
    }
  });

  const totalApps = appHistory.length || 1;

  // 3. Get student profile for availability matching
  const [studentProfile] = await sql`
    SELECT public_data FROM users WHERE id = ${userId}
  `;
  const publicData = (studentProfile?.public_data || {}) as Record<string, unknown>;
  const studentHoursPerWeek = (publicData?.hoursPerWeek as number) || 20;

  // 4. Get all published listings (excluding already applied)
  const listings = await sql`
    SELECT
      l.id, l.title, l.description, l.category,
      l.skills_required, l.remote_allowed, l.compensation,
      l.hours_per_week, l.published_at,
      u.company_name, u.display_name as author_name
    FROM listings l
    LEFT JOIN users u ON u.id = l.author_id
    WHERE l.status = 'published'
    ORDER BY l.published_at DESC NULLS LAST
    LIMIT 100
  `;

  // 5. Score each listing
  const scored: MatchScore[] = listings
    .filter((l: Record<string, unknown>) => {
      const id = l.id as string;
      // Exclude projects already applied to
      if (appliedListingIds.has(id)) return false;
      // Exclude projects where invite was declined or accepted (already in pipeline)
      if (excludedInviteListingIds.has(id)) return false;
      return true;
    })
    .map((l: Record<string, unknown>) => {
      const requiredSkills = ((l.skills_required as string[]) || []).map((s) =>
        typeof s === 'string' ? s.toLowerCase() : ''
      );

      // --- SKILL MATCH (40%) ---
      const matchedSkills = requiredSkills.filter((s) => studentSkillNames.has(s));
      const missingSkills = requiredSkills.filter((s) => !studentSkillNames.has(s));
      const skillMatch =
        requiredSkills.length > 0
          ? matchedSkills.length / requiredSkills.length
          : studentSkillNames.size > 0
            ? 0.3 // Some base score if no skills specified
            : 0;

      // --- CATEGORY AFFINITY (20%) --- learned from history
      const cat = (l.category as string) || 'General';
      const catApps = categoryApplyCount[cat] || 0;
      const catSuccess = categorySuccessCount[cat] || 0;
      // Base affinity from skill categories + learned from applications
      const baseAffinity = studentCategories.has(cat) ? 0.3 : 0;
      const learnedAffinity = Math.min(catApps / totalApps, 1) * 0.4;
      const successBonus = catSuccess > 0 ? 0.3 : 0;
      const categoryAffinity = Math.min(baseAffinity + learnedAffinity + successBonus, 1);

      // --- AVAILABILITY (15%) ---
      const projectHours = (l.hours_per_week as number) || 15;
      const hoursDiff = Math.abs(studentHoursPerWeek - projectHours);
      const availability = hoursDiff <= 5 ? 1 : hoursDiff <= 10 ? 0.7 : hoursDiff <= 20 ? 0.4 : 0.2;

      // --- RECENCY BOOST (10%) ---
      const publishedAt = l.published_at
        ? new Date(l.published_at as string).getTime()
        : Date.now();
      const daysOld = (Date.now() - publishedAt) / (1000 * 60 * 60 * 24);
      const recencyBoost = daysOld <= 7 ? 1 : daysOld <= 14 ? 0.8 : daysOld <= 30 ? 0.5 : 0.2;

      // --- SUCCESS HISTORY (15%) ---
      // Higher score if student has been accepted in projects requiring similar skills
      const acceptedApps = appHistory.filter(
        (a: Record<string, unknown>) =>
          a.status === 'accepted' || a.status === 'completed'
      );
      const acceptedSkills = new Set<string>();
      acceptedApps.forEach((a: Record<string, unknown>) => {
        ((a.skills_required as string[]) || []).forEach((s) =>
          acceptedSkills.add(typeof s === 'string' ? s.toLowerCase() : '')
        );
      });
      const overlapWithSuccess = requiredSkills.filter((s) => acceptedSkills.has(s)).length;
      const successHistory =
        requiredSkills.length > 0 && acceptedSkills.size > 0
          ? overlapWithSuccess / requiredSkills.length
          : 0;

      // --- WEIGHTED TOTAL ---
      const matchScore =
        skillMatch * 0.4 +
        categoryAffinity * 0.2 +
        availability * 0.15 +
        recencyBoost * 0.1 +
        successHistory * 0.15;

      return {
        listingId: l.id as string,
        title: l.title as string,
        description: ((l.description as string) || '').slice(0, 200),
        category: l.category as string | null,
        company: (l.company_name as string) || (l.author_name as string) || null,
        compensation: l.compensation as string | null,
        remoteAllowed: l.remote_allowed as boolean,
        skillsRequired: requiredSkills,
        matchScore: Math.round(matchScore * 100),
        matchBreakdown: {
          skillMatch: Math.round(skillMatch * 100),
          categoryAffinity: Math.round(categoryAffinity * 100),
          availability: Math.round(availability * 100),
          recencyBoost: Math.round(recencyBoost * 100),
          successHistory: Math.round(successHistory * 100),
        },
        matchedSkills: matchedSkills,
        missingSkills: missingSkills,
        publishedAt: (l.published_at as string) || '',
      };
    });

  // Sort by match score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}

/**
 * Get recommended students for a project listing (for corporate partners).
 */
export async function getRecommendedStudents(
  listingId: string,
  limit = 20
): Promise<StudentMatchScore[]> {
  // 1. Get listing details
  const [listing] = await sql`
    SELECT skills_required, category, hours_per_week
    FROM listings WHERE id = ${listingId}
  `;
  if (!listing) return [];

  const requiredSkills = ((listing.skills_required as string[]) || []).map((s) =>
    typeof s === 'string' ? s.toLowerCase() : ''
  );

  // 2. Get students who haven't applied yet
  const students = await sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.university, u.gpa,
      ARRAY_AGG(s.name) FILTER (WHERE s.name IS NOT NULL) as skill_names
    FROM users u
    LEFT JOIN user_skills us ON us.user_id = u.id
    LEFT JOIN skills s ON s.id = us.skill_id
    WHERE u.role = 'student'
      AND u.id NOT IN (
        SELECT student_id FROM project_applications WHERE listing_id = ${listingId}
      )
    GROUP BY u.id
    LIMIT 200
  `;

  // 3. Score each student
  const scored = students.map((s: Record<string, unknown>) => {
    const studentSkills = ((s.skill_names as string[]) || []).map((sk) =>
      sk ? sk.toLowerCase() : ''
    );
    const matchedSkills = requiredSkills.filter((r) => studentSkills.includes(r));
    const missingSkills = requiredSkills.filter((r) => !studentSkills.includes(r));
    const matchScore =
      requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;

    return {
      studentId: s.id as string,
      firstName: s.first_name as string,
      lastName: s.last_name as string,
      email: s.email as string,
      university: s.university as string | null,
      gpa: s.gpa as string | null,
      matchScore,
      matchedSkills,
      missingSkills,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}
