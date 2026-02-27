/**
 * GET /api/ai/access-check — Check if the current user can use a specific AI feature
 *
 * Query params:
 *   - feature (required): AiFeatureKey — e.g. "student_coaching", "project_scoping"
 *   - action  (optional): string — specific action within the feature to check
 *
 * Returns an AiAccessResult with `allowed`, `config`, and optional `denial` details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkAiAccess } from '@/lib/ai/feature-gate';
import type { AiFeatureKey } from '@/lib/ai/types';

const VALID_FEATURES: AiFeatureKey[] = [
  'student_coaching',
  'project_scoping',
  'portfolio_intelligence',
  'talent_insights',
  'institutional_analytics',
];

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const feature = searchParams.get('feature');
    const action = searchParams.get('action') || undefined;

    if (!feature) {
      return NextResponse.json(
        { error: 'Missing required query parameter: feature' },
        { status: 400 },
      );
    }

    if (!VALID_FEATURES.includes(feature as AiFeatureKey)) {
      return NextResponse.json(
        { error: `Invalid feature. Must be one of: ${VALID_FEATURES.join(', ')}` },
        { status: 400 },
      );
    }

    const tenantId = session.data.tenantId;
    const userId = session.data.userId;

    const result = await checkAiAccess(
      tenantId,
      userId,
      feature as AiFeatureKey,
      action,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI access check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
