/**
 * Public Portfolio API
 * GET — Fetch public portfolio by slug (no auth required)
 */

import { NextResponse } from 'next/server';
import { getPortfolioBySlug } from '@/lib/portfolio';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const portfolio = await getPortfolioBySlug(slug);

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('Public portfolio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
