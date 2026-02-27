/**
 * GET /api/admin/faq — Get FAQ items (public, no auth required for homepage)
 * PUT /api/admin/faq — Update FAQ items (admin only)
 *
 * FAQ stored in landing_content table with section = 'faq'
 * Content JSONB: { items: [{ question, answer, order }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const SECTION_KEY = 'faq';

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
    const [row] = await sql`
      SELECT content FROM landing_content WHERE section = ${SECTION_KEY}
    `;

    const content = (row?.content || {}) as Record<string, unknown>;
    const items = (content.items || []) as Array<Record<string, unknown>>;

    // Sort by order field
    const sortedItems = items.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

    return NextResponse.json({ items: sortedItems });
  } catch (error) {
    console.error('FAQ GET error:', error);
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

    const content = JSON.stringify({ items });

    await sql`
      INSERT INTO landing_content (section, content, updated_by, updated_at)
      VALUES (${SECTION_KEY}, ${content}::jsonb, ${session.data.userId}, NOW())
      ON CONFLICT (section) DO UPDATE SET
        content = ${content}::jsonb,
        updated_by = ${session.data.userId},
        updated_at = NOW()
    `;

    return NextResponse.json({ items });
  } catch (error) {
    console.error('FAQ PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
