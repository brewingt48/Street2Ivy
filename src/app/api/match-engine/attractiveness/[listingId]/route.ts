/**
 * Corporate Attractiveness API — Single Listing
 * GET — Get attractiveness score for a listing
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeAttractivenessScore } from '@/lib/match-engine';

export async function GET(
  _request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngineAttractive');
      if (!allowed) {
        return NextResponse.json({ error: 'Corporate Attractiveness requires Enterprise plan' }, { status: 403 });
      }
    }

    const result = await computeAttractivenessScore(params.listingId);

    if (!result) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get attractiveness score:', error);
    return NextResponse.json({ error: 'Failed to get attractiveness score' }, { status: 500 });
  }
}
