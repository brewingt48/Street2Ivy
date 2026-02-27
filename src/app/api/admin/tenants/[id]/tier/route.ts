/**
 * PUT /api/admin/tenants/[id]/tier — Change a tenant's subscription tier
 *
 * Updates the tenant's subscription_tier_id and applies the tier's
 * default features (merged with existing features).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateTierSchema = z.object({
  tierId: z.string().uuid(),
});

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
    const parsed = updateTierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tierId } = parsed.data;

    // Verify tenant exists
    const [tenant] = await sql`
      SELECT id, features FROM tenants WHERE id = ${id}
    `;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify tier exists
    const [tier] = await sql`
      SELECT id, name, features, ai_config FROM subscription_tiers WHERE id = ${tierId}
    `;
    if (!tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    // Merge tier features with existing tenant features
    const existingFeatures = (tenant.features || {}) as Record<string, unknown>;
    const tierFeatures = (tier.features || {}) as Record<string, unknown>;
    const mergedFeatures = { ...existingFeatures, ...tierFeatures, plan: tier.name };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresJson = sql.json(mergedFeatures as any);

    const [updated] = await sql`
      UPDATE tenants
      SET
        subscription_tier_id = ${tierId},
        features = ${featuresJson},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, subscription_tier_id, features, updated_at
    `;

    return NextResponse.json({
      tenant: {
        id: updated.id,
        subscriptionTierId: updated.subscription_tier_id,
        features: updated.features,
        updatedAt: updated.updated_at,
      },
      tier: {
        id: tier.id,
        name: tier.name,
      },
    });
  } catch (error) {
    console.error('Update tenant tier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
