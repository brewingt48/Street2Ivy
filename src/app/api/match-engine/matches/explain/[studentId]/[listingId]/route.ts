/**
 * Match Explanation API
 * GET — Get detailed score breakdown for a student-listing pair
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeMatch } from '@/lib/match-engine';

export async function GET(
  _request: Request,
  { params }: { params: { studentId: string; listingId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngine');
      if (!allowed) {
        return NextResponse.json({ error: 'Match Engine™ requires Professional plan or higher' }, { status: 403 });
      }
    }

    // Students can only view their own match explanations
    if (session.data.role === 'student' && params.studentId !== session.data.userId) {
      return NextResponse.json({ error: "Cannot view other students' match details" }, { status: 403 });
    }

    const result = await computeMatch(params.studentId, params.listingId, {
      tenantId,
    });

    return NextResponse.json({
      studentId: params.studentId,
      listingId: params.listingId,
      compositeScore: result.score,
      signals: result.signals,
      computedAt: result.computedAt,
      version: result.version,
    });
  } catch (error) {
    console.error('Failed to get match explanation:', error);
    return NextResponse.json({ error: 'Failed to get match explanation' }, { status: 500 });
  }
}
