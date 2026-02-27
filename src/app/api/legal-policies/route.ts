/**
 * GET /api/legal-policies — Public: list all published platform legal policies
 *
 * No auth required. Returns only title and slug for footer links.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const policies = await sql`
      SELECT title, slug
      FROM legal_policies
      WHERE tenant_id IS NULL AND is_published = true
      ORDER BY sort_order, title
    `;

    return NextResponse.json({
      policies: policies.map((p: Record<string, unknown>) => ({
        title: p.title,
        slug: p.slug,
      })),
    });
  } catch (error) {
    console.error('Public legal policies GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
