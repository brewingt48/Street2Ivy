/**
 * GET /api/education/faq — Get FAQ items for the tenant
 * PUT /api/education/faq — Update FAQ items (edu admin only)
 *
 * Tenant FAQ stored in tenant's features JSONB as features.faq
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const faqItemSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
  order: z.number().int().min(0).optional(),
});

const updateFaqSchema = z.object({
  items: z.array(faqItemSchema).max(50),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ items: [] });
    }

    const [tenant] = await sql`
      SELECT features FROM tenants WHERE id = ${tenantId}
    `;

    const features = (tenant?.features || {}) as Record<string, unknown>;
    const items = (features.faq || []) as Array<Record<string, unknown>>;

    // Sort by order field
    const sortedItems = items.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

    return NextResponse.json({ items: sortedItems });
  } catch (error) {
    console.error('Tenant FAQ GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateFaqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Assign order values if not provided
    const items = parsed.data.items.map((item, i) => ({
      ...item,
      order: item.order ?? i,
    }));

    // Get current features and merge
    const [current] = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
    const currentFeatures = (current?.features || {}) as Record<string, unknown>;
    const newFeatures = { ...currentFeatures, faq: items };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresJson = sql.json(newFeatures as any);

    await sql`
      UPDATE tenants SET features = ${featuresJson}, updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Tenant FAQ PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
