/**
 * GET /api/ai/usage — Get current AI usage status for the tenant
 *
 * Returns usage count, limits, reset date, plan, and model info.
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getUsageStatus } from '@/lib/ai/config';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    const usage = await getUsageStatus(tenantId);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('AI usage status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
