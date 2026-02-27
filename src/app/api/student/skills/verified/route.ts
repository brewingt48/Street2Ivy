/**
 * Verified Skills API
 * GET — Get student's verified (non-self-reported) skills
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
      return NextResponse.json({ error: 'Student access only' }, { status: 403 });
    }

    const rows = await sql`
      SELECT
        us.skill_id,
        s.name as skill_name,
        s.category,
        us.proficiency_level,
        us.verification_source,
        us.verified_at,
        us.evidence_notes,
        l.title as project_title
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      LEFT JOIN listings l ON l.id = us.project_id
      WHERE us.user_id = ${session.data.userId}
        AND us.verification_source != 'self_reported'
      ORDER BY us.verified_at DESC NULLS LAST
    `;

    return NextResponse.json({ skills: rows });
  } catch (error) {
    console.error('Verified skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
