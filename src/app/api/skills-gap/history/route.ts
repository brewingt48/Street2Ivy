/**
 * Skills Gap History API
 * GET — Fetch gap analysis snapshot history
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'skillsGapAnalyzer');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Skills Gap Analyzer requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const targetRoleId = searchParams.get('targetRoleId');

    let studentId = session.data.userId;
    if (session.data.role === 'educational_admin') {
      const paramStudentId = searchParams.get('studentId');
      if (paramStudentId) studentId = paramStudentId;
    }

    const rows = targetRoleId
      ? await sql`
          SELECT sgs.*, tr.title as target_role_title
          FROM skill_gap_snapshots sgs
          JOIN target_roles tr ON tr.id = sgs.target_role_id
          WHERE sgs.student_id = ${studentId}
            AND sgs.target_role_id = ${targetRoleId}
          ORDER BY sgs.snapshot_date DESC
          LIMIT 50
        `
      : await sql`
          SELECT sgs.*, tr.title as target_role_title
          FROM skill_gap_snapshots sgs
          JOIN target_roles tr ON tr.id = sgs.target_role_id
          WHERE sgs.student_id = ${studentId}
          ORDER BY sgs.snapshot_date DESC
          LIMIT 50
        `;

    return NextResponse.json({ snapshots: rows });
  } catch (error) {
    console.error('Skills gap history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
