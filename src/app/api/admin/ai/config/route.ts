/**
 * GET /api/admin/ai/config — Default tier configs + per-tenant AI overrides
 * PUT /api/admin/ai/config — Update a tenant's AI configuration override
 *
 * Manages the AI tier system configuration. Defaults come from AI_TIER_CONFIGS,
 * and individual tenants can have overrides stored in tenant_ai_overrides table
 * as well as legacy features.aiConfig JSONB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { AI_TIER_CONFIGS } from '@/lib/ai/config';
import { getTenantAiConfig, clearConfigCache } from '@/lib/ai/feature-gate';
import { z } from 'zod';

const updateAiConfigSchema = z.object({
  tenantId: z.string().uuid('Valid tenant ID required'),
  overrides: z.array(
    z.object({
      key: z.string().min(1, 'Override key is required'),
      value: z.unknown(),
      expiresAt: z.string().datetime().optional(),
    })
  ).optional(),
  // Legacy aiConfig merge (backward compatibility)
  aiConfig: z.object({
    model: z.string().optional(),
    maxMonthlyUses: z.number().int().optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
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

    const tenantOverrides = await Promise.all(
      tenants.map(async (t: Record<string, unknown>) => {
        const features = (t.features || {}) as Record<string, unknown>;
        const plan = (features.plan as string) || 'starter';
        const legacyAiConfig = features.aiConfig as Record<string, unknown> | undefined;
        const tenantId = t.id as string;

        // Fetch v2 overrides from tenant_ai_overrides table
        let v2Overrides: Array<{ key: string; value: unknown; expiresAt: string | null }> = [];
        try {
          const overrideRows = await sql`
            SELECT override_key, override_value, expires_at
            FROM tenant_ai_overrides
            WHERE tenant_id = ${tenantId}
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY override_key ASC
          `;
          v2Overrides = overrideRows.map((r: Record<string, unknown>) => ({
            key: r.override_key as string,
            value: r.override_value,
            expiresAt: r.expires_at ? (r.expires_at as Date).toISOString() : null,
          }));
        } catch {
          // tenant_ai_overrides table may not exist yet
        }

        // Resolve the full config for display
        let resolvedConfig = null;
        try {
          resolvedConfig = await getTenantAiConfig(tenantId);
        } catch {
          // Ignore resolution errors
        }

        return {
          tenantId,
          tenantName: t.name as string,
          subdomain: t.subdomain as string,
          plan,
          hasLegacyOverride: !!legacyAiConfig,
          legacyOverride: legacyAiConfig || null,
          v2Overrides,
          resolvedConfig,
        };
      })
    );

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

    const { tenantId, overrides, aiConfig } = parsed.data;

    // Verify tenant exists
    const existing = await sql`SELECT id FROM tenants WHERE id = ${tenantId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Handle v2 overrides via tenant_ai_overrides table
    if (overrides && overrides.length > 0) {
      for (const override of overrides) {
        const valueJson = JSON.stringify(override.value);
        const expiresAt = override.expiresAt || null;

        await sql`
          INSERT INTO tenant_ai_overrides (tenant_id, override_key, override_value, expires_at)
          VALUES (${tenantId}, ${override.key}, ${valueJson}::jsonb, ${expiresAt})
          ON CONFLICT (tenant_id, override_key)
          DO UPDATE SET
            override_value = ${valueJson}::jsonb,
            expires_at = ${expiresAt},
            updated_at = NOW()
        `;
      }
    }

    // Handle legacy aiConfig merge (backward compatibility)
    if (aiConfig) {
      const aiConfigJson = JSON.stringify(aiConfig);
      await sql`
        UPDATE tenants
        SET features = features || jsonb_build_object('aiConfig', ${aiConfigJson}::jsonb),
            updated_at = NOW()
        WHERE id = ${tenantId}
      `;
    }

    // Clear the config cache for this tenant so changes take effect immediately
    clearConfigCache();

    // Fetch updated config
    const resolvedConfig = await getTenantAiConfig(tenantId);

    // Fetch current overrides
    let currentOverrides: Array<{ key: string; value: unknown; expiresAt: string | null }> = [];
    try {
      const overrideRows = await sql`
        SELECT override_key, override_value, expires_at
        FROM tenant_ai_overrides
        WHERE tenant_id = ${tenantId}
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY override_key ASC
      `;
      currentOverrides = overrideRows.map((r: Record<string, unknown>) => ({
        key: r.override_key as string,
        value: r.override_value,
        expiresAt: r.expires_at ? (r.expires_at as Date).toISOString() : null,
      }));
    } catch {
      // tenant_ai_overrides table may not exist yet
    }

    return NextResponse.json({
      tenantId,
      resolvedConfig,
      v2Overrides: currentOverrides,
    });
  } catch (error) {
    console.error('Admin AI config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
