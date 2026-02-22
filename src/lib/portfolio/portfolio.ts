/**
 * Portfolio Service
 *
 * CRUD operations for student portfolios.
 */

import { sql } from '@/lib/db';

export interface PortfolioData {
  id: string;
  studentId: string;
  slug: string;
  headline: string;
  bio: string;
  theme: string;
  showSkills: boolean;
  showReadiness: boolean;
  isPublic: boolean;
  viewCount: number;
  projects: Array<{
    id: string;
    listingId: string;
    title: string;
    company: string;
    displayOrder: number;
    isFeatured: boolean;
    studentReflection: string | null;
  }>;
  badges: Array<{
    id: string;
    badgeType: string;
    label: string;
    earnedAt: string;
    metadata: Record<string, unknown>;
  }>;
}

export async function createPortfolio(
  studentId: string,
  data: { headline?: string; bio?: string; theme?: string }
): Promise<{ id: string; slug: string }> {
  // Get student info for slug generation
  const userRows = await sql`
    SELECT first_name, last_name, graduation_year FROM users WHERE id = ${studentId}
  `;
  if (userRows.length === 0) throw new Error('Student not found');

  const user = userRows[0];
  const slug = await generateUniqueSlug(
    user.first_name as string,
    user.last_name as string,
    user.graduation_year != null ? String(user.graduation_year) : null
  );

  const displayName = `${user.first_name} ${user.last_name}`;

  const rows = await sql`
    INSERT INTO student_portfolios (student_id, slug, display_name, headline, bio, theme)
    VALUES (
      ${studentId},
      ${slug},
      ${displayName},
      ${data.headline || ''},
      ${data.bio || ''},
      ${data.theme || 'professional'}
    )
    RETURNING id, slug
  `;

  return { id: rows[0].id as string, slug: rows[0].slug as string };
}

export async function getPortfolio(studentId: string): Promise<PortfolioData | null> {
  const portfolioRows = await sql`
    SELECT * FROM student_portfolios WHERE student_id = ${studentId}
  `;
  if (portfolioRows.length === 0) return null;

  const p = portfolioRows[0];
  const portfolioId = p.id as string;

  // Fetch projects
  const projectRows = await sql`
    SELECT pp.id, pp.project_id, pp.display_order, pp.is_featured, pp.student_reflection,
           l.title, u.first_name as company_first, u.last_name as company_last, u.company_name
    FROM portfolio_projects pp
    JOIN listings l ON l.id = pp.project_id
    LEFT JOIN users u ON u.id = l.author_id
    WHERE pp.portfolio_id = ${portfolioId}
    ORDER BY pp.display_order ASC
  `;

  // Fetch badges
  const badgeRows = await sql`
    SELECT id, badge_type, badge_label, earned_at, badge_metadata
    FROM portfolio_badges
    WHERE student_id = ${studentId}
    ORDER BY earned_at DESC
  `;

  return {
    id: portfolioId,
    studentId: p.student_id as string,
    slug: p.slug as string,
    headline: (p.headline as string) || '',
    bio: (p.bio as string) || '',
    theme: p.theme as string,
    showSkills: p.show_skill_chart as boolean,
    showReadiness: p.show_readiness_score as boolean,
    isPublic: p.is_public as boolean,
    viewCount: Number(p.view_count),
    projects: projectRows.map((r) => ({
      id: r.id as string,
      listingId: r.project_id as string,
      title: r.title as string,
      company: (r.company_name as string) || `${r.company_first} ${r.company_last}`,
      displayOrder: Number(r.display_order),
      isFeatured: r.is_featured as boolean,
      studentReflection: r.student_reflection as string | null,
    })),
    badges: badgeRows.map((r) => ({
      id: r.id as string,
      badgeType: r.badge_type as string,
      label: r.badge_label as string,
      earnedAt: r.earned_at as string,
      metadata: (r.badge_metadata || {}) as Record<string, unknown>,
    })),
  };
}

export async function getPortfolioBySlug(
  slug: string
): Promise<(PortfolioData & { studentName: string; institution: string }) | null> {
  const rows = await sql`
    SELECT sp.*, u.first_name, u.last_name, t.name as institution_name
    FROM student_portfolios sp
    JOIN users u ON u.id = sp.student_id
    LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE sp.slug = ${slug} AND sp.is_public = true
  `;
  if (rows.length === 0) return null;

  const p = rows[0];
  const studentId = p.student_id as string;
  const portfolioId = p.id as string;

  const projectRows = await sql`
    SELECT pp.id, pp.project_id, pp.display_order, pp.is_featured, pp.student_reflection,
           l.title, u.company_name, u.first_name as author_first, u.last_name as author_last
    FROM portfolio_projects pp
    JOIN listings l ON l.id = pp.project_id
    LEFT JOIN users u ON u.id = l.author_id
    WHERE pp.portfolio_id = ${portfolioId}
    ORDER BY pp.display_order ASC
  `;

  const badgeRows = await sql`
    SELECT id, badge_type, badge_label, earned_at, badge_metadata
    FROM portfolio_badges WHERE student_id = ${studentId}
    ORDER BY earned_at DESC
  `;

  return {
    id: portfolioId,
    studentId,
    slug: p.slug as string,
    headline: (p.headline as string) || '',
    bio: (p.bio as string) || '',
    theme: p.theme as string,
    showSkills: p.show_skill_chart as boolean,
    showReadiness: p.show_readiness_score as boolean,
    isPublic: p.is_public as boolean,
    viewCount: Number(p.view_count),
    studentName: `${p.first_name} ${p.last_name}`,
    institution: (p.institution_name as string) || '',
    projects: projectRows.map((r) => ({
      id: r.id as string,
      listingId: r.project_id as string,
      title: r.title as string,
      company: (r.company_name as string) || `${r.author_first} ${r.author_last}`,
      displayOrder: Number(r.display_order),
      isFeatured: r.is_featured as boolean,
      studentReflection: r.student_reflection as string | null,
    })),
    badges: badgeRows.map((r) => ({
      id: r.id as string,
      badgeType: r.badge_type as string,
      label: r.badge_label as string,
      earnedAt: r.earned_at as string,
      metadata: (r.badge_metadata || {}) as Record<string, unknown>,
    })),
  };
}

export async function updatePortfolio(
  studentId: string,
  data: Partial<{
    headline: string;
    bio: string;
    theme: string;
    showSkills: boolean;
    showReadiness: boolean;
    isPublic: boolean;
  }>
): Promise<void> {
  const hasUpdates =
    data.headline !== undefined ||
    data.bio !== undefined ||
    data.theme !== undefined ||
    data.showSkills !== undefined ||
    data.showReadiness !== undefined ||
    data.isPublic !== undefined;

  if (!hasUpdates) return;

  // Build dynamic update using COALESCE for type safety with sql tagged template
  await sql`
    UPDATE student_portfolios SET
      headline = COALESCE(${data.headline ?? null}, headline),
      bio = COALESCE(${data.bio ?? null}, bio),
      theme = COALESCE(${data.theme ?? null}, theme),
      show_skill_chart = COALESCE(${data.showSkills ?? null}, show_skill_chart),
      show_readiness_score = COALESCE(${data.showReadiness ?? null}, show_readiness_score),
      is_public = COALESCE(${data.isPublic ?? null}, is_public),
      updated_at = NOW()
    WHERE student_id = ${studentId}
  `;
}

export async function updatePortfolioProjects(
  portfolioId: string,
  projects: Array<{
    listingId: string;
    displayOrder: number;
    isFeatured: boolean;
    studentReflection?: string;
  }>
): Promise<void> {
  // Delete existing and re-insert
  await sql`DELETE FROM portfolio_projects WHERE portfolio_id = ${portfolioId}`;

  for (const project of projects) {
    await sql`
      INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
      VALUES (
        ${portfolioId},
        ${project.listingId},
        ${project.displayOrder},
        ${project.isFeatured},
        ${project.studentReflection || null}
      )
    `;
  }
}

export async function recordView(
  portfolioId: string,
  viewerUserId?: string,
  viewerType?: string,
  referrer?: string
): Promise<void> {
  await sql`
    INSERT INTO portfolio_views (portfolio_id, viewer_user_id, viewer_type, referrer)
    VALUES (${portfolioId}, ${viewerUserId || null}, ${viewerType || 'anonymous'}, ${referrer || null})
  `;

  await sql`
    UPDATE student_portfolios SET view_count = view_count + 1 WHERE id = ${portfolioId}
  `;
}

async function generateUniqueSlug(
  firstName: string,
  lastName: string,
  gradYear: string | null
): Promise<string> {
  const base = `${firstName}-${lastName}${gradYear ? `-${gradYear}` : ''}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

  let slug = base;
  let suffix = 2;

  for (;;) {
    const existing = await sql`SELECT id FROM student_portfolios WHERE slug = ${slug}`;
    if (existing.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
    if (suffix > 100) throw new Error('Could not generate unique slug');
  }
}
