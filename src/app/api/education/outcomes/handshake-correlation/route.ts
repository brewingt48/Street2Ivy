/**
 * GET /api/education/outcomes/handshake-correlation
 *
 * Returns correlation metrics between Proveground engagement
 * and career readiness, segmented by student activity level.
 *
 * Requires:
 *   - Authenticated user with educational_admin or admin role
 *   - outcomesDashboard AND handshakeIntegration features enabled
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeHandshakeCorrelationMetrics } from '@/lib/outcomes/handshake-correlation';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;

    if (tenantId) {
      const [hasOutcomes, hasHandshake] = await Promise.all([
        hasFeature(tenantId, 'outcomesDashboard'),
        hasFeature(tenantId, 'handshakeIntegration'),
      ]);

      if (!hasOutcomes || !hasHandshake) {
        return NextResponse.json(
          { error: 'Enterprise plan with Handshake integration required' },
          { status: 403 },
        );
      }
    }

    const data = await computeHandshakeCorrelationMetrics(tenantId!);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Handshake correlation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
