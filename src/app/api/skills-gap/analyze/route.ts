/**
 * Skills Gap Analysis API
 * GET — Analyze a student's skills against a target role
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { analyzeStudentGaps } from '@/lib/skills-gap';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
    const targetRoleId = searchParams.get('targetRoleId');
    if (!targetRoleId) {
      return NextResponse.json({ error: 'targetRoleId is required' }, { status: 400 });
    }

    // Determine which student to analyze
    let studentId = session.data.userId;
    if (session.data.role === 'educational_admin') {
      const paramStudentId = searchParams.get('studentId');
      if (paramStudentId) {
        studentId = paramStudentId;
      }
    }

    const result = await analyzeStudentGaps(studentId, targetRoleId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Skills gap analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
