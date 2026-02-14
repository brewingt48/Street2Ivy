/**
 * GET /api/student/invites — List invitations received by a student
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const invites = await sql`
      SELECT ci.id, ci.corporate_partner_id, ci.listing_id, ci.project_title,
             ci.message, ci.status, ci.sent_at, ci.responded_at,
             u.display_name as corporate_name, u.company_name
      FROM corporate_invites ci
      LEFT JOIN users u ON u.id = ci.corporate_partner_id
      WHERE ci.student_id = ${session.data.userId}
      ORDER BY ci.sent_at DESC
    `;

    return NextResponse.json({
      invites: invites.map((inv: Record<string, unknown>) => ({
        id: inv.id,
        corporatePartnerId: inv.corporate_partner_id,
        corporateName: inv.corporate_name || inv.company_name || 'Company',
        companyName: inv.company_name,
        listingId: inv.listing_id,
        projectTitle: inv.project_title,
        message: inv.message,
        status: inv.status,
        sentAt: inv.sent_at,
        respondedAt: inv.responded_at,
      })),
    });
  } catch (error) {
    console.error('Student invites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
