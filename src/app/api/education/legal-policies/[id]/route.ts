/**
 * GET /api/education/legal-policies/:id — Get a tenant legal policy for editing
 * PUT /api/education/legal-policies/:id — Update a tenant legal policy
 * DELETE /api/education/legal-policies/:id — Delete a tenant legal policy
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updatePolicySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id } = await params;

    const policies = await sql`
      SELECT id, title, slug, content, is_published, sort_order, created_at, updated_at
      FROM legal_policies
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;

    if (policies.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const p = policies[0];
    return NextResponse.json({
      policy: {
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content,
        isPublished: p.is_published,
        sortOrder: p.sort_order,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
    });
  } catch (error) {
    console.error('Get education legal policy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = updatePolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await sql`
      UPDATE legal_policies SET
        title = COALESCE(${data.title ?? null}, title),
        slug = COALESCE(${data.slug ?? null}, slug),
        content = COALESCE(${data.content ?? null}, content),
        is_published = COALESCE(${data.isPublished ?? null}, is_published),
        sort_order = COALESCE(${data.sortOrder ?? null}, sort_order),
        updated_by = ${session.data.userId},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id, title, slug, is_published, sort_order, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ policy: result[0] });
  } catch (error) {
    console.error('Update education legal policy error:', error);
    if (String(error).includes('idx_legal_policies_tenant_slug')) {
      return NextResponse.json({ error: 'A policy with this slug already exists for your institution' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id } = await params;

    const result = await sql`
      DELETE FROM legal_policies
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete education legal policy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
