/**
 * GET /api/education/legal-policies — List tenant's legal policies
 * POST /api/education/legal-policies — Create a new tenant legal policy
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPolicySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().default(''),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

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

    const policies = await sql`
      SELECT id, title, slug, is_published, sort_order, created_at, updated_at
      FROM legal_policies
      WHERE tenant_id = ${tenantId}
      ORDER BY sort_order, title
    `;

    return NextResponse.json({
      policies: policies.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        isPublished: p.is_published,
        sortOrder: p.sort_order,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  } catch (error) {
    console.error('Education legal policies GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await sql`
      INSERT INTO legal_policies (title, slug, content, is_published, sort_order, tenant_id, created_by, updated_by)
      VALUES (
        ${data.title}, ${slug}, ${data.content}, ${data.isPublished},
        ${data.sortOrder}, ${tenantId}, ${session.data.userId}, ${session.data.userId}
      )
      RETURNING id, title, slug, is_published, sort_order, created_at
    `;

    return NextResponse.json({ policy: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Create education legal policy error:', error);
    if (String(error).includes('idx_legal_policies_tenant_slug')) {
      return NextResponse.json({ error: 'A policy with this slug already exists for your institution' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
