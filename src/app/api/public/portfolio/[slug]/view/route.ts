/**
 * Portfolio View Tracking API
 * POST — Record a portfolio view (no auth required)
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { recordView } from '@/lib/portfolio';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Look up portfolio ID from slug
    const rows = await sql`
      SELECT id FROM student_portfolios WHERE slug = ${slug}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const portfolioId = rows[0].id as string;
    const referrer = request.headers.get('referer') || undefined;

    await recordView(portfolioId, undefined, 'anonymous', referrer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
