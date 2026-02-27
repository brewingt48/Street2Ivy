/**
 * GET    /api/admin/tenants/[id]/ai-overrides — List AI overrides for a tenant
 * POST   /api/admin/tenants/[id]/ai-overrides — Add an AI override
 * DELETE /api/admin/tenants/[id]/ai-overrides — Remove an AI override
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const createOverrideSchema = z.object({
  overrideKey: z.string().min(1).max(100),
  overrideValue: z.unknown(),
  reason: z.string().optional(),
});

const deleteOverrideSchema = z.object({
  overrideKey: z.string().min(1).max(100),
});

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

    // Verify tenant exists
    const [tenant] = await sql`
      SELECT id, name FROM tenants WHERE id = ${id}
    `;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const overrides = await sql`
      SELECT * FROM tenant_ai_overrides
      WHERE tenant_id = ${id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      tenantId: id,
      tenantName: tenant.name,
      overrides: overrides.map((o: Record<string, unknown>) => ({
        id: o.id,
        tenantId: o.tenant_id,
        overrideKey: o.override_key,
        overrideValue: o.override_value,
        reason: o.reason,
        createdBy: o.created_by,
        expiresAt: o.expires_at,
        createdAt: o.created_at,
      })),
    });
  } catch (error) {
    console.error('Get tenant AI overrides error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = createOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { overrideKey, overrideValue, reason } = parsed.data;

    // Verify tenant exists
    const [tenant] = await sql`
      SELECT id FROM tenants WHERE id = ${id}
    `;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valueJson = sql.json(overrideValue as any);

    // Upsert override (uses unique constraint on tenant_id + override_key)
    const [override] = await sql`
      INSERT INTO tenant_ai_overrides (tenant_id, override_key, override_value, reason, created_by)
      VALUES (${id}, ${overrideKey}, ${valueJson}, ${reason || null}, ${session.data.userId})
      ON CONFLICT (tenant_id, override_key)
      DO UPDATE SET
        override_value = EXCLUDED.override_value,
        reason = EXCLUDED.reason,
        created_by = EXCLUDED.created_by,
        created_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({
      override: {
        id: override.id,
        tenantId: override.tenant_id,
        overrideKey: override.override_key,
        overrideValue: override.override_value,
        reason: override.reason,
        createdBy: override.created_by,
        expiresAt: override.expires_at,
        createdAt: override.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create tenant AI override error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const parsed = deleteOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { overrideKey } = parsed.data;

    const result = await sql`
      DELETE FROM tenant_ai_overrides
      WHERE tenant_id = ${id} AND override_key = ${overrideKey}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, overrideKey });
  } catch (error) {
    console.error('Delete tenant AI override error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
