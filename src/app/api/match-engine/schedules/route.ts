/**
 * Schedule Management API
 * GET  — Get student's schedules
 * POST — Create/update a schedule entry
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { sql } from '@/lib/db';
import { invalidateStudentScores } from '@/lib/match-engine';

const createScheduleSchema = z.object({
  sportSeasonId: z.string().uuid().optional(),
  academicCalendarId: z.string().uuid().optional(),
  scheduleType: z.enum(['sport', 'academic', 'custom', 'work']).default('sport'),
  customBlocks: z.array(z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    label: z.string().optional(),
  })).default([]),
  availableHoursPerWeek: z.number().min(0).max(168).optional(),
  travelConflicts: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional(),
  })).default([]),
  effectiveStart: z.string().optional(),
  effectiveEnd: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngineSchedule');
      if (!allowed) {
        return NextResponse.json({ error: 'Schedule management requires Professional plan or higher' }, { status: 403 });
      }
    }

    const schedules = await sql`
      SELECT ss.*, sp.sport_name, sp.season_type, sp.start_month, sp.end_month,
             sp.practice_hours_per_week, sp.competition_hours_per_week,
             sp.travel_days_per_month, sp.intensity_level,
             ac.term_name, ac.term_type, ac.start_date as cal_start, ac.end_date as cal_end
      FROM student_schedules ss
      LEFT JOIN sport_seasons sp ON sp.id = ss.sport_season_id
      LEFT JOIN academic_calendars ac ON ac.id = ss.academic_calendar_id
      WHERE ss.user_id = ${session.data.userId}
      ORDER BY ss.created_at DESC
    `;

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Failed to get schedules:', error);
    return NextResponse.json({ error: 'Failed to get schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'matchEngineSchedule');
      if (!allowed) {
        return NextResponse.json({ error: 'Schedule management requires Professional plan or higher' }, { status: 403 });
      }
    }

    const body = await request.json();
    const data = createScheduleSchema.parse(body);

    const [schedule] = await sql`
      INSERT INTO student_schedules (
        user_id, sport_season_id, academic_calendar_id, schedule_type,
        custom_blocks, available_hours_per_week, travel_conflicts,
        effective_start, effective_end, notes
      ) VALUES (
        ${session.data.userId},
        ${data.sportSeasonId || null},
        ${data.academicCalendarId || null},
        ${data.scheduleType},
        ${JSON.stringify(data.customBlocks)}::jsonb,
        ${data.availableHoursPerWeek || null},
        ${JSON.stringify(data.travelConflicts)}::jsonb,
        ${data.effectiveStart || null},
        ${data.effectiveEnd || null},
        ${data.notes || null}
      )
      RETURNING *
    `;

    // Invalidate match scores since schedule changed
    await invalidateStudentScores(session.data.userId, 'schedule_change');

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
