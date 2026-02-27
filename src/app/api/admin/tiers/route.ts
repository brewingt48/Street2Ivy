/**
 * GET /api/admin/tiers — List all subscription tiers with tenant counts
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tiers = await sql`
      SELECT
        st.*,
        (SELECT COUNT(*) FROM tenants WHERE subscription_tier_id = st.id) AS tenant_count
      FROM subscription_tiers st
      ORDER BY sort_order ASC NULLS LAST, name ASC
    `;

    return NextResponse.json({
      tiers: tiers.map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        displayName: t.display_name,
        sortOrder: t.sort_order,
        maxUsers: t.max_users,
        maxProjects: t.max_projects,
        maxActiveProjects: t.max_active_projects,
        aiConfig: t.ai_config,
        networkConfig: t.network_config,
        monthlyPriceCents: t.monthly_price_cents,
        annualPriceCents: t.annual_price_cents,
        features: t.features,
        brandingConfig: t.branding_config,
        isActive: t.is_active,
        tenantCount: Number(t.tenant_count) || 0,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error) {
    console.error('List tiers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
