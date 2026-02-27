/**
 * Match Compute API
 * POST — Force recompute for a student-listing pair
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeMatch } from '@/lib/match-engine';

const computeSchema = z.object({
  studentId: z.string().uuid(),
  listingId: z.string().uuid(),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const { studentId, listingId } = computeSchema.parse(body);

    // Students can only compute their own matches
    if (session.data.role === 'student' && studentId !== session.data.userId) {
      return NextResponse.json({ error: 'Cannot compute matches for other students' }, { status: 403 });
    }

    const result = await computeMatch(studentId, listingId, {
      forceRecompute: true,
      tenantId,
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to compute match:', error);
    return NextResponse.json({ error: 'Failed to compute match' }, { status: 500 });
  }
}
