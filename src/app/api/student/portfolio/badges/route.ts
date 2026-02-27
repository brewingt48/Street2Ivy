/**
 * Portfolio Badges API
 * GET — Get all earned badges
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const badges = await sql`
      SELECT id, badge_type, badge_label, earned_at, badge_metadata
      FROM portfolio_badges
      WHERE student_id = ${session.data.userId}
      ORDER BY earned_at DESC
    `;

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Badges GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
