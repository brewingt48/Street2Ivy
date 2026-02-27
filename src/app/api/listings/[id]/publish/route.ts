/**
 * POST /api/listings/:id/publish — Publish a draft listing
 * POST /api/listings/:id/close — Close a published listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await sql`
      UPDATE listings
      SET status = 'published', published_at = NOW(), updated_at = NOW()
      WHERE id = ${params.id}
        AND author_id = ${session.data.userId}
        AND status = 'draft'
      RETURNING id, status, published_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Listing not found or already published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ listing: result[0] });
  } catch (error) {
    console.error('Listing publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
