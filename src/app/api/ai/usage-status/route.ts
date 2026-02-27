/**
 * GET /api/ai/usage-status — Get per-user per-feature AI usage status
 *
 * Query params:
 *   - feature (required): string — the AI feature key (e.g. "student_coaching")
 *
 * Returns { used, limit, remaining, resetDate } for the current user and month.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getUsageStatus } from '@/lib/ai/feature-gate';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const feature = searchParams.get('feature');

    if (!feature) {
      return NextResponse.json(
        { error: 'Missing required query parameter: feature' },
        { status: 400 },
      );
    }

    const tenantId = session.data.tenantId;
    const userId = session.data.userId;

    const status = await getUsageStatus(tenantId, userId, feature);

    return NextResponse.json(status);
  } catch (error) {
    console.error('AI usage status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
