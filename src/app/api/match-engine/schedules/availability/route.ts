/**
 * Schedule Availability API
 * GET — Get availability windows for a date range
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { getAvailabilityWindows } from '@/lib/match-engine';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split('T')[0];
    })();

    // Load student schedules
    const schedules = await sql`
      SELECT ss.*, sp.sport_name, sp.season_type, sp.start_month, sp.end_month,
             COALESCE(sp.practice_hours_per_week, 0)::numeric as practice_hours_per_week,
             COALESCE(sp.competition_hours_per_week, 0)::numeric as competition_hours_per_week,
             COALESCE(sp.travel_days_per_month, 0) as travel_days_per_month,
             COALESCE(sp.intensity_level, 3) as intensity_level
      FROM student_schedules ss
      LEFT JOIN sport_seasons sp ON sp.id = ss.sport_season_id
      WHERE ss.user_id = ${session.data.userId} AND ss.is_active = TRUE
    `;

    const scheduleEntries = schedules.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      scheduleType: s.schedule_type as string,
      sportSeasonId: s.sport_season_id as string | null,
      sportName: s.sport_name as string | undefined,
      seasonType: s.season_type as string | undefined,
      startMonth: s.start_month as number | undefined,
      endMonth: s.end_month as number | undefined,
      practiceHoursPerWeek: Number(s.practice_hours_per_week) || 0,
      competitionHoursPerWeek: Number(s.competition_hours_per_week) || 0,
      travelDaysPerMonth: Number(s.travel_days_per_month) || 0,
      intensityLevel: Number(s.intensity_level) || 3,
      customBlocks: (s.custom_blocks || []) as Array<{ day: string; startTime: string; endTime: string; label?: string }>,
      travelConflicts: (s.travel_conflicts || []) as Array<{ startDate: string; endDate: string; reason?: string }>,
      availableHoursPerWeek: s.available_hours_per_week ? Number(s.available_hours_per_week) : null,
      effectiveStart: s.effective_start as string | null,
      effectiveEnd: s.effective_end as string | null,
      isActive: s.is_active as boolean,
    }));

    const rawWindows = getAvailabilityWindows(scheduleEntries, startDate, endDate);

    // Transform to the shape the frontend AvailabilityCalendar expects
    const windows = rawWindows.map((w) => {
      const availableHours = w.availableHoursPerWeek;
      const totalCommittedHours = Math.max(0, 40 - availableHours);
      const sportConflicts = w.constraints.filter((c: string) => !c.startsWith('Travel:'));
      const travelConflicts = w.constraints.filter((c: string) => c.startsWith('Travel:')).length;

      let overallAvailability: 'high' | 'medium' | 'low' | 'none';
      if (availableHours >= 30) overallAvailability = 'high';
      else if (availableHours >= 15) overallAvailability = 'medium';
      else if (availableHours > 0) overallAvailability = 'low';
      else overallAvailability = 'none';

      return {
        weekStart: w.startDate,
        weekEnd: w.endDate,
        availableHours,
        totalCommittedHours,
        sportConflicts,
        travelConflicts,
        overallAvailability,
      };
    });

    return NextResponse.json({ windows, startDate, endDate });
  } catch (error) {
    console.error('Failed to get availability:', error);
    return NextResponse.json({ error: 'Failed to get availability' }, { status: 500 });
  }
}
