/**
 * Admin Skill Mappings API
 * GET  — View athletic skill mappings
 * POST — Add/update skill mapping
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

const createMappingSchema = z.object({
  sportName: z.string().min(1),
  position: z.string().optional(),
  professionalSkill: z.string().min(1),
  transferStrength: z.number().min(0).max(1).default(0.5),
  skillCategory: z.string().default('General'),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');

    const mappings = sport
      ? await sql`
          SELECT * FROM athletic_skill_mappings
          WHERE sport_name = ${sport}
          ORDER BY transfer_strength DESC
        `
      : await sql`
          SELECT * FROM athletic_skill_mappings
          ORDER BY sport_name, transfer_strength DESC
        `;

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Failed to get skill mappings:', error);
    return NextResponse.json({ error: 'Failed to get skill mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const data = createMappingSchema.parse(body);

    const [mapping] = await sql`
      INSERT INTO athletic_skill_mappings (
        sport_name, position, professional_skill,
        transfer_strength, skill_category, description
      ) VALUES (
        ${data.sportName}, ${data.position || null}, ${data.professionalSkill},
        ${data.transferStrength}, ${data.skillCategory}, ${data.description || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create skill mapping:', error);
    return NextResponse.json({ error: 'Failed to create skill mapping' }, { status: 500 });
  }
}
