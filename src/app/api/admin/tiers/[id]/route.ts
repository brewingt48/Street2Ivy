/**
 * GET /api/admin/tiers/[id]  — Get single tier detail
 * PUT /api/admin/tiers/[id]  — Update tier definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [tier] = await sql`
      SELECT
        st.*,
        (SELECT COUNT(*) FROM tenants WHERE subscription_tier_id = st.id) AS tenant_count
      FROM subscription_tiers st
      WHERE st.id = ${id}
    `;

    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({
      tier: {
        id: tier.id,
        name: tier.name,
        displayName: tier.display_name,
        sortOrder: tier.sort_order,
        maxUsers: tier.max_users,
        maxProjects: tier.max_projects,
        maxActiveProjects: tier.max_active_projects,
        aiConfig: tier.ai_config,
        networkConfig: tier.network_config,
        monthlyPriceCents: tier.monthly_price_cents,
        annualPriceCents: tier.annual_price_cents,
        features: tier.features,
        brandingConfig: tier.branding_config,
        isActive: tier.is_active,
        tenantCount: Number(tier.tenant_count) || 0,
        createdAt: tier.created_at,
        updatedAt: tier.updated_at,
      },
    });
  } catch (error) {
    console.error('Get tier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch current tier
    const [current] = await sql`
      SELECT * FROM subscription_tiers WHERE id = ${id}
    `;
    if (!current) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Merge JSONB fields
    const currentAiConfig = (current.ai_config || {}) as Record<string, unknown>;
    const currentNetworkConfig = (current.network_config || {}) as Record<string, unknown>;
    const currentFeatures = (current.features || {}) as Record<string, unknown>;
    const currentBrandingConfig = (current.branding_config || {}) as Record<string, unknown>;

    const newAiConfig = body.aiConfig
      ? { ...currentAiConfig, ...body.aiConfig }
      : currentAiConfig;
    const newNetworkConfig = body.networkConfig
      ? { ...currentNetworkConfig, ...body.networkConfig }
      : currentNetworkConfig;
    const newFeatures = body.features
      ? { ...currentFeatures, ...body.features }
      : currentFeatures;
    const newBrandingConfig = body.brandingConfig
      ? { ...currentBrandingConfig, ...body.brandingConfig }
      : currentBrandingConfig;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiConfigJson = sql.json(newAiConfig as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networkConfigJson = sql.json(newNetworkConfig as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresJson = sql.json(newFeatures as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingConfigJson = sql.json(newBrandingConfig as any);

    const [updated] = await sql`
      UPDATE subscription_tiers
      SET
        display_name = ${body.displayName ?? current.display_name ?? ''},
        sort_order = ${body.sortOrder ?? current.sort_order ?? 0},
        max_users = ${body.maxUsers ?? current.max_users ?? 0},
        max_projects = ${body.maxProjects ?? current.max_projects ?? 0},
        max_active_projects = ${body.maxActiveProjects ?? current.max_active_projects ?? 0},
        monthly_price_cents = ${body.monthlyPriceCents ?? current.monthly_price_cents ?? 0},
        annual_price_cents = ${body.annualPriceCents ?? current.annual_price_cents ?? 0},
        ai_config = ${aiConfigJson},
        network_config = ${networkConfigJson},
        features = ${featuresJson},
        branding_config = ${brandingConfigJson},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Get tenant count
    const [countRow] = await sql`
      SELECT COUNT(*) AS cnt FROM tenants WHERE subscription_tier_id = ${id}
    `;

    return NextResponse.json({
      tier: {
        id: updated.id,
        name: updated.name,
        displayName: updated.display_name,
        sortOrder: updated.sort_order,
        maxUsers: updated.max_users,
        maxProjects: updated.max_projects,
        maxActiveProjects: updated.max_active_projects,
        aiConfig: updated.ai_config,
        networkConfig: updated.network_config,
        monthlyPriceCents: updated.monthly_price_cents,
        annualPriceCents: updated.annual_price_cents,
        features: updated.features,
        brandingConfig: updated.branding_config,
        isActive: updated.is_active,
        tenantCount: Number(countRow.cnt) || 0,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Update tier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
