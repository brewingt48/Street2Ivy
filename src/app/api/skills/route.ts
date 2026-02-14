/**
 * GET /api/skills — List all skills (for autocomplete/selection)
 * POST /api/skills — Add skills to current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';

    let skills;
    if (search) {
      skills = await sql`
        SELECT id, name, category, description
        FROM skills
        WHERE name ILIKE ${'%' + search + '%'}
        ${category ? sql`AND category = ${category}` : sql``}
        ORDER BY name
        LIMIT 50
      `;
    } else if (category) {
      skills = await sql`
        SELECT id, name, category, description
        FROM skills
        WHERE category = ${category}
        ORDER BY name
      `;
    } else {
      skills = await sql`
        SELECT id, name, category, description
        FROM skills
        ORDER BY category, name
      `;
    }

    // Also get distinct categories
    const categories = await sql`
      SELECT DISTINCT category FROM skills ORDER BY category
    `;

    return NextResponse.json({
      skills,
      categories: categories.map((c: Record<string, unknown>) => c.category as string),
    });
  } catch (error) {
    console.error('Skills list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { skillIds } = body as { skillIds: string[] };

    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return NextResponse.json({ error: 'skillIds array is required' }, { status: 400 });
    }

    // Delete existing skills and insert new ones (replace strategy)
    await sql`DELETE FROM user_skills WHERE user_id = ${session.data.userId}`;

    if (skillIds.length > 0) {
      const values = skillIds.map((skillId) => ({
        user_id: session.data.userId,
        skill_id: skillId,
      }));

      for (const v of values) {
        await sql`
          INSERT INTO user_skills (user_id, skill_id)
          VALUES (${v.user_id}, ${v.skill_id})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Return updated skills
    const userSkills = await sql`
      SELECT s.id, s.name, s.category
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${session.data.userId}
      ORDER BY s.name
    `;

    return NextResponse.json({ skills: userSkills });
  } catch (error) {
    console.error('Skills update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
