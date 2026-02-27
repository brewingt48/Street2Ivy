/**
 * Corporate Attractiveness API — Company Aggregate
 * GET — Get aggregate attractiveness for a company
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { getCompanyAttractiveness } from '@/lib/match-engine';

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
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

    const result = await getCompanyAttractiveness(params.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get company attractiveness:', error);
    return NextResponse.json({ error: 'Failed to get company attractiveness' }, { status: 500 });
  }
}
