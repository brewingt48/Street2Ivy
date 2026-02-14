/**
 * GET /api/admin/content — Get all landing page content sections
 * PUT /api/admin/content — Update a landing page section
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateContentSchema = z.object({
  section: z.string().min(1),
  content: z.record(z.unknown()),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sections = await sql`
      SELECT section, content, updated_at FROM landing_content ORDER BY section
    `;

    return NextResponse.json({
      sections: sections.map((s: Record<string, unknown>) => ({
        section: s.section,
        content: s.content,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error) {
    console.error('Admin content error:', error);
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
    const parsed = updateContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { section, content } = parsed.data;

    const result = await sql`
      INSERT INTO landing_content (section, content, updated_by, updated_at)
      VALUES (${section}, ${JSON.stringify(content)}::jsonb, ${session.data.userId}, NOW())
      ON CONFLICT (section) DO UPDATE SET
        content = ${JSON.stringify(content)}::jsonb,
        updated_by = ${session.data.userId},
        updated_at = NOW()
      RETURNING section, updated_at
    `;

    return NextResponse.json({ section: result[0] });
  } catch (error) {
    console.error('Update content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
