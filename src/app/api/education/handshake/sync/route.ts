/**
 * Handshake Manual Sync API
 * POST — Trigger a manual sync from Handshake
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { syncSkillDemandFromHandshake, syncTargetRolesFromHandshake } from '@/lib/handshake/sync';

export async function POST() {
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
      const allowed = await hasFeature(tenantId, 'handshakeIntegration');
      if (!allowed) {
        return NextResponse.json({ error: 'Handshake integration requires Enterprise plan' }, { status: 403 });
      }
    }

    const [demandResult, rolesResult] = await Promise.all([
      syncSkillDemandFromHandshake(tenantId!),
      syncTargetRolesFromHandshake(tenantId!),
    ]);

    return NextResponse.json({
      success: true,
      demand: demandResult,
      roles: rolesResult,
    });
  } catch (error) {
    console.error('Handshake sync error:', error);
    return NextResponse.json({ error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
