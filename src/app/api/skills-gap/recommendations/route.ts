/**
 * Skills Gap Recommendations API
 * GET — Get top skill gap recommendations with projects
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

    const result = await analyzeStudentGaps(session.data.userId, targetRoleId);

    // Extract top 3 gaps as recommendations
    const recommendations = result.gaps.slice(0, 3).map((gap) => ({
      skillName: gap.skillName,
      category: gap.category,
      currentLevel: gap.currentLevel,
      requiredLevel: gap.requiredLevel,
      gapSeverity: gap.gapSeverity,
      importance: gap.importance,
      recommendedProjects: gap.recommendedProjects,
      estimatedScoreImpact: Math.round(
        ((gap.requiredLevel - gap.currentLevel) / result.gaps.length) * 100 / result.gaps.length
      ),
    }));

    return NextResponse.json({
      recommendations,
      overallReadinessScore: result.overallReadinessScore,
      readinessTier: result.readinessTier,
    });
  } catch (error) {
    console.error('Skills gap recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
