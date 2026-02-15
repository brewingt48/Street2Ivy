/**
 * Admin Queue API
 * GET — View recomputation queue
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const queue = status === 'pending'
      ? await sql`
          SELECT rq.*, u.first_name, u.last_name, u.email
          FROM recomputation_queue rq
          LEFT JOIN users u ON u.id = rq.student_id
          WHERE rq.processed_at IS NULL
          ORDER BY rq.priority DESC, rq.queued_at ASC
          LIMIT ${limit}
        `
      : await sql`
          SELECT rq.*, u.first_name, u.last_name, u.email
          FROM recomputation_queue rq
          LEFT JOIN users u ON u.id = rq.student_id
          WHERE rq.processed_at IS NOT NULL
          ORDER BY rq.processed_at DESC
          LIMIT ${limit}
        `;

    return NextResponse.json({ queue, status });
  } catch (error) {
    console.error('Failed to get queue:', error);
    return NextResponse.json({ error: 'Failed to get queue' }, { status: 500 });
  }
}
