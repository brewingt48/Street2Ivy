/**
 * GET /api/ai/usage — Get current AI usage status for the authenticated user
 *
 * Returns per-feature usage counts with limits and reset dates (v2),
 * plus a legacy top-level summary for backward compatibility.
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getUsageStatus, getUsageStatusV2 } from '@/lib/ai/config';
import type { AiFeatureKey } from '@/lib/ai/types';

const FEATURE_KEYS: AiFeatureKey[] = [
  'student_coaching',
  'project_scoping',
  'portfolio_intelligence',
  'talent_insights',
  'institutional_analytics',
];

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // V2: Per-user per-feature usage
    const features: Record<string, { used: number; limit: number; remaining: number; resetDate: string }> = {};
    for (const feature of FEATURE_KEYS) {
      features[feature] = await getUsageStatusV2(tenantId, userId, feature);
    }

    // Legacy: Tenant-level aggregate (backward compat)
    const legacy = await getUsageStatus(tenantId);

    return NextResponse.json({
      // V2 per-feature breakdown
      features,
      // Legacy top-level fields for backward compatibility
      ...legacy,
    });
  } catch (error) {
    console.error('AI usage status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
