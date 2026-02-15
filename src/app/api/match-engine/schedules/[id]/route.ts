/**
 * Schedule Entry API — DELETE
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { invalidateStudentScores } from '@/lib/match-engine';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await sql`
      DELETE FROM student_schedules
      WHERE id = ${params.id} AND user_id = ${session.data.userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await invalidateStudentScores(session.data.userId, 'schedule_change');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
