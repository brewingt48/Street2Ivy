/**
 * Student Match API
 * GET — Get match scores for the current student
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { getStudentMatches } from '@/lib/match-engine';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Student role required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngine');
      if (!allowed) {
        return NextResponse.json({ error: 'Match Engine requires Professional plan or higher' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const minScore = parseInt(searchParams.get('minScore') || '0');

    const matches = await getStudentMatches(session.data.userId, {
      limit,
      minScore,
      tenantId,
    });

    return NextResponse.json({
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Failed to get student matches:', error);
    return NextResponse.json({ error: 'Failed to get matches' }, { status: 500 });
  }
}
