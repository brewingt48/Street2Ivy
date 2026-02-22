/**
 * Badge Streak Evaluation Cron Job
 *
 * POST /api/cron/evaluate-streaks
 *
 * Evaluates all active students for streak badges.
 * Called by Heroku Scheduler (e.g., weekly). Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { evaluateStreaks } from '@/lib/portfolio/badges';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all students who have at least one completed project
    const students = await sql`
      SELECT DISTINCT student_id
      FROM project_applications
      WHERE status = 'completed'
    `;

    let processed = 0;
    let badgesAwarded = 0;

    for (const row of students) {
      try {
        const awarded = await evaluateStreaks(row.student_id as string);
        badgesAwarded += awarded.length;
        processed++;
      } catch (error) {
        console.error(`Streak evaluation failed for student ${row.student_id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} students, awarded ${badgesAwarded} streak badges`,
      processed,
      badgesAwarded,
    });
  } catch (error) {
    console.error('Streak evaluation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
