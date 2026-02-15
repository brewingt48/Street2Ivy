/**
 * Listing Match API
 * GET — Get student matches for a specific listing (corporate partner view)
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { getListingMatches } from '@/lib/match-engine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner' && session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Corporate or admin role required' }, { status: 403 });
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

    const matches = await getListingMatches(params.id, {
      limit,
      minScore,
      tenantId,
    });

    return NextResponse.json({
      listingId: params.id,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Failed to get listing matches:', error);
    return NextResponse.json({ error: 'Failed to get matches' }, { status: 500 });
  }
}
