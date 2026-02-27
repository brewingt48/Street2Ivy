/**
 * Education Skills Analytics API
 * GET — Aggregated skills gap data for an institution
 *
 * Supports filtering by target role (profession) to show readiness
 * for specific career paths. Target roles are curated professions
 * with defined skill requirements used for skills gap assessment.
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { aggregateInstitutionGaps } from '@/lib/skills-gap';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'skillsGapAnalyzer');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Skills Gap Analyzer requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      program: searchParams.get('program') || undefined,
      cohort: searchParams.get('cohort') || undefined,
      graduationYear: searchParams.get('graduationYear') || undefined,
      targetRoleId: searchParams.get('targetRoleId') || undefined,
    };

    // Fetch available target roles (professions) for this institution
    const targetRoles = await sql`
      SELECT tr.id, tr.title,
        (SELECT COUNT(*) FROM role_skill_requirements rsr WHERE rsr.target_role_id = tr.id) as skill_count
      FROM target_roles tr
      WHERE tr.institution_id IS NULL OR tr.institution_id = ${tenantId}
      ORDER BY tr.title ASC
    `;

    const result = await aggregateInstitutionGaps(tenantId!, filters);
    return NextResponse.json({
      ...result,
      targetRoles: targetRoles.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        skillCount: Number(r.skill_count),
      })),
    });
  } catch (error) {
    console.error('Skills analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
