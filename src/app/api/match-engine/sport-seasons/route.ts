/**
 * Sport Seasons API
 * GET  — List all sport seasons
 * POST — Admin: create sport season
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

const createSportSeasonSchema = z.object({
  sportName: z.string().min(1),
  seasonType: z.enum(['regular', 'postseason', 'offseason', 'preseason', 'spring', 'fall', 'indoor', 'outdoor', 'championship']).default('regular'),
  startMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
  practiceHoursPerWeek: z.number().min(0).max(40).default(20),
  competitionHoursPerWeek: z.number().min(0).max(20).default(5),
  travelDaysPerMonth: z.number().int().min(0).max(20).default(2),
  intensityLevel: z.number().int().min(1).max(5).default(3),
  division: z.string().default('D1'),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');

    const seasons = sport
      ? await sql`
          SELECT * FROM sport_seasons WHERE sport_name = ${sport} ORDER BY start_month
        `
      : await sql`
          SELECT * FROM sport_seasons ORDER BY sport_name, start_month
        `;

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error('Failed to get sport seasons:', error);
    return NextResponse.json({ error: 'Failed to get sport seasons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can create sport seasons
    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const data = createSportSeasonSchema.parse(body);

    const [season] = await sql`
      INSERT INTO sport_seasons (
        sport_name, season_type, start_month, end_month,
        practice_hours_per_week, competition_hours_per_week,
        travel_days_per_month, intensity_level, division, notes
      ) VALUES (
        ${data.sportName}, ${data.seasonType}, ${data.startMonth}, ${data.endMonth},
        ${data.practiceHoursPerWeek}, ${data.competitionHoursPerWeek},
        ${data.travelDaysPerMonth}, ${data.intensityLevel}, ${data.division},
        ${data.notes || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create sport season:', error);
    return NextResponse.json({ error: 'Failed to create sport season' }, { status: 500 });
  }
}
