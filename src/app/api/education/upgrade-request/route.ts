/**
 * POST /api/education/upgrade-request — Edu admin requests a plan upgrade
 *
 * Sets upgradeRequestPending = true and requestedPlan on the tenant features.
 * Platform admin can then review and approve by changing the plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const upgradeSchema = z.object({
  requestedPlan: z.enum(['professional', 'enterprise']),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = upgradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    // Get current features and merge the upgrade request
    const [current] = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
    if (!current) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currentFeatures = (current.features || {}) as Record<string, unknown>;
    const newFeatures = {
      ...currentFeatures,
      upgradeRequestPending: true,
      requestedPlan: parsed.data.requestedPlan,
      upgradeRequestMessage: parsed.data.message || '',
      upgradeRequestedAt: new Date().toISOString(),
      upgradeRequestedBy: session.data.userId,
    };

    await sql`
      UPDATE tenants
      SET features = ${JSON.stringify(newFeatures)}::jsonb, updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    return NextResponse.json({
      success: true,
      message: `Upgrade request to ${parsed.data.requestedPlan} plan submitted successfully`,
    });
  } catch (error) {
    console.error('Upgrade request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const [tenant] = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
    const features = (tenant?.features || {}) as Record<string, unknown>;

    return NextResponse.json({
      currentPlan: features.plan || 'starter',
      upgradeRequestPending: !!features.upgradeRequestPending,
      requestedPlan: features.requestedPlan || null,
    });
  } catch (error) {
    console.error('Get upgrade status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
