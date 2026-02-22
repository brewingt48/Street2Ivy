/**
 * Education Skills Analytics API
 * GET — Aggregated skills gap data for an institution
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { aggregateInstitutionGaps } from '@/lib/skills-gap';

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
    };

    const result = await aggregateInstitutionGaps(tenantId!, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Skills analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
