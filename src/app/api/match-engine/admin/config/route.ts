/**
 * Admin Config API
 * GET — Get tenant match engine config
 * PUT — Update signal weights
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { sql } from '@/lib/db';

const updateConfigSchema = z.object({
  signalWeights: z.object({
    temporal: z.number().min(0).max(1),
    skills: z.number().min(0).max(1),
    sustainability: z.number().min(0).max(1),
    growth: z.number().min(0).max(1),
    trust: z.number().min(0).max(1),
    network: z.number().min(0).max(1),
  }).optional(),
  minScoreThreshold: z.number().min(0).max(100).optional(),
  maxResultsPerQuery: z.number().int().min(1).max(200).optional(),
  enableAthleticTransfer: z.boolean().optional(),
  enableScheduleMatching: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngineAdmin');
      if (!allowed) {
        return NextResponse.json({ error: 'Match Engine™ Admin requires Enterprise plan' }, { status: 403 });
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const [config] = await sql`
      SELECT * FROM match_engine_config WHERE tenant_id = ${tenantId}
    `;

    if (!config) {
      // Return defaults
      return NextResponse.json({
        config: {
          signalWeights: { temporal: 0.25, skills: 0.30, sustainability: 0.15, growth: 0.10, trust: 0.10, network: 0.10 },
          minScoreThreshold: 20,
          maxResultsPerQuery: 50,
          enableAthleticTransfer: true,
          enableScheduleMatching: true,
        },
        isDefault: true,
      });
    }

    return NextResponse.json({ config, isDefault: false });
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'matchEngineAdmin');
    if (!allowed) {
      return NextResponse.json({ error: 'Match Engine™ Admin requires Enterprise plan' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateConfigSchema.parse(body);

    // Validate weights sum to ~1.0 if provided
    if (data.signalWeights) {
      const sum = Object.values(data.signalWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        return NextResponse.json({ error: 'Signal weights must sum to 1.0' }, { status: 400 });
      }
    }

    const [config] = await sql`
      INSERT INTO match_engine_config (tenant_id, signal_weights, min_score_threshold,
                                       max_results_per_query, enable_athletic_transfer,
                                       enable_schedule_matching)
      VALUES (
        ${tenantId},
        ${data.signalWeights ? JSON.stringify(data.signalWeights) : '{"temporal":0.25,"skills":0.30,"sustainability":0.15,"growth":0.10,"trust":0.10,"network":0.10}'}::jsonb,
        ${data.minScoreThreshold || 20},
        ${data.maxResultsPerQuery || 50},
        ${data.enableAthleticTransfer ?? true},
        ${data.enableScheduleMatching ?? true}
      )
      ON CONFLICT (tenant_id) DO UPDATE
      SET signal_weights = COALESCE(${data.signalWeights ? JSON.stringify(data.signalWeights) : null}::jsonb, match_engine_config.signal_weights),
          min_score_threshold = COALESCE(${data.minScoreThreshold || null}, match_engine_config.min_score_threshold),
          max_results_per_query = COALESCE(${data.maxResultsPerQuery || null}, match_engine_config.max_results_per_query),
          enable_athletic_transfer = COALESCE(${data.enableAthleticTransfer ?? null}, match_engine_config.enable_athletic_transfer),
          enable_schedule_matching = COALESCE(${data.enableScheduleMatching ?? null}, match_engine_config.enable_schedule_matching),
          updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
