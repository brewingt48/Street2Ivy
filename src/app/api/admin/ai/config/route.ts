/**
 * GET /api/admin/ai/config — Default tier configs + per-tenant AI overrides
 * PUT /api/admin/ai/config — Update a tenant's AI configuration override
 *
 * Manages the AI tier system configuration. Defaults come from AI_TIER_CONFIGS,
 * and individual tenants can have overrides stored in their features JSONB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { AI_TIER_CONFIGS } from '@/lib/ai/config';
import { z } from 'zod';

const updateAiConfigSchema = z.object({
  tenantId: z.string().uuid('Valid tenant ID required'),
  aiConfig: z.object({
    model: z.string().optional(),
    maxMonthlyUses: z.number().int().optional(),
    features: z.array(z.string()).optional(),
  }),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all tenants with their features (which may include aiConfig overrides)
    const tenants = await sql`
      SELECT id, name, subdomain, status, features
      FROM tenants
      WHERE status = 'active'
      ORDER BY name ASC
    `;

    const tenantOverrides = tenants.map((t: Record<string, unknown>) => {
      const features = (t.features || {}) as Record<string, unknown>;
      const plan = (features.plan as string) || 'starter';
      const aiConfig = features.aiConfig as Record<string, unknown> | undefined;

      return {
        tenantId: t.id as string,
        tenantName: t.name as string,
        subdomain: t.subdomain as string,
        plan,
        hasOverride: !!aiConfig,
        override: aiConfig || null,
      };
    });

    return NextResponse.json({
      tierConfigs: AI_TIER_CONFIGS,
      tenantOverrides,
    });
  } catch (error) {
    console.error('Admin AI config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateAiConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tenantId, aiConfig } = parsed.data;

    // Verify tenant exists
    const existing = await sql`SELECT id FROM tenants WHERE id = ${tenantId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Merge aiConfig into the tenant's features JSONB
    const aiConfigJson = JSON.stringify(aiConfig);
    const updated = await sql`
      UPDATE tenants
      SET features = features || jsonb_build_object('aiConfig', ${aiConfigJson}::jsonb),
          updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING id, name, features
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      tenantId: updated[0].id,
      tenantName: updated[0].name,
      features: updated[0].features,
    });
  } catch (error) {
    console.error('Admin AI config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
