/**
 * GET /api/tenant/features — Get feature flags for the current user's tenant
 *
 * Returns the tenant's features JSONB so client-side code can check
 * feature access and show/hide UI accordingly.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;

    // System admins get all features enabled
    if (!tenantId || session.data.role === 'admin') {
      return NextResponse.json({
        features: {
          plan: 'enterprise',
          aiCoaching: true,
          customBranding: true,
          analytics: true,
          apiAccess: true,
          advancedReporting: true,
          studentRatings: true,
          corporateRatings: true,
          matchingAlgorithm: true,
          issueReporting: true,
          inviteManagement: true,
          aiMatchInsights: true,
          aiDiffView: true,
          aiProjectScoping: true,
          aiPortfolioIntelligence: true,
          aiTalentInsights: true,
          matchEngine: true,
          matchEngineSchedule: true,
          matchEngineAttractive: true,
          matchEngineAdmin: true,
          maxStudents: -1,
          maxListings: -1,
        },
      });
    }

    const rows = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
    if (rows.length === 0) {
      return NextResponse.json({ features: {} });
    }

    return NextResponse.json({
      features: rows[0].features || {},
    });
  } catch (error) {
    console.error('Tenant features error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
