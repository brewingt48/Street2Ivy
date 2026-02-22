/**
 * GET /api/legal-policies/:slug — Public: get a single published platform policy by slug
 *
 * No auth required. Returns full policy content for display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const policies = await sql`
      SELECT title, slug, content, updated_at
      FROM legal_policies
      WHERE slug = ${slug} AND tenant_id IS NULL AND is_published = true
    `;

    if (policies.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const p = policies[0];
    return NextResponse.json({
      policy: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        updatedAt: p.updated_at,
      },
    });
  } catch (error) {
    console.error('Public legal policy GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
