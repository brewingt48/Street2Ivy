/**
 * POST /api/student/invites/:id/decline — Decline a corporate invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify ownership and status
    const invites = await sql`
      SELECT id, corporate_partner_id, listing_id, project_title, status
      FROM corporate_invites
      WHERE id = ${params.id} AND student_id = ${session.data.userId}
    `;

    if (invites.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const invite = invites[0];

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Can only decline pending invites' }, { status: 400 });
    }

    const result = await sql`
      UPDATE corporate_invites
      SET status = 'declined', responded_at = NOW(), updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING id, status, responded_at
    `;

    // Get student name for notification
    const users = await sql`SELECT display_name FROM users WHERE id = ${session.data.userId}`;
    const studentName = (users[0]?.display_name as string) || 'A student';

    // Notify the corporate partner
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${invite.corporate_partner_id},
        'invite_declined',
        'Invitation Declined',
        ${studentName + ' declined your invitation' + (invite.project_title ? ' for "' + invite.project_title + '"' : '')},
        ${JSON.stringify({ inviteId: params.id, projectTitle: invite.project_title })}::jsonb
      )
    `;

    return NextResponse.json({ invite: result[0] });
  } catch (error) {
    console.error('Decline invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
