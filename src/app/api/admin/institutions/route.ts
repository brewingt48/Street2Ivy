/**
 * GET /api/admin/institutions — List institutions
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const institutions = await sql`
      SELECT i.domain, i.name, i.membership_status, i.ai_coaching_enabled,
             i.membership_start_date, i.membership_end_date, i.created_at,
             (SELECT COUNT(*) FROM users u WHERE u.institution_domain = i.domain) as user_count
      FROM institutions i
      ORDER BY i.name
    `;

    return NextResponse.json({
      institutions: institutions.map((i: Record<string, unknown>) => ({
        domain: i.domain,
        name: i.name,
        membershipStatus: i.membership_status,
        aiCoachingEnabled: i.ai_coaching_enabled,
        membershipStartDate: i.membership_start_date,
        membershipEndDate: i.membership_end_date,
        createdAt: i.created_at,
        userCount: parseInt(i.user_count as string),
      })),
    });
  } catch (error) {
    console.error('Admin institutions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
