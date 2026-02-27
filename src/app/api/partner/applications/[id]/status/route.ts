/**
 * PUT /api/partner/applications/[id]/status — Accept or reject an application
 *
 * Updates the status of a network_application and tracks who reviewed it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

async function getPartnerUser(email: string) {
  const rows = await sql`
    SELECT npu.id, npu.network_partner_id, npu.role
    FROM network_partner_users npu
    WHERE npu.email = ${email} AND npu.status = 'active'
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const applicationId = params.id;

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    // Verify application belongs to one of the partner's listings
    const apps = await sql`
      SELECT na.id, na.status AS current_status, na.network_listing_id,
             nl.max_students, nl.students_accepted
      FROM network_applications na
      JOIN network_listings nl ON nl.id = na.network_listing_id
      WHERE na.id = ${applicationId}
        AND nl.network_partner_id = ${partnerUser.network_partner_id}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    if (app.current_status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot change status from '${app.current_status}' — application is no longer pending` },
        { status: 400 }
      );
    }

    // If accepting, check max students
    if (status === 'accepted') {
      const maxStudents = app.max_students as number;
      const accepted = app.students_accepted as number;
      if (maxStudents && accepted >= maxStudents) {
        return NextResponse.json(
          { error: 'This listing has already accepted the maximum number of students' },
          { status: 400 }
        );
      }

      // Increment students_accepted on the listing
      await sql`
        UPDATE network_listings
        SET students_accepted = students_accepted + 1, updated_at = NOW()
        WHERE id = ${app.network_listing_id}
      `;
    }

    // Update application status
    const [updated] = await sql`
      UPDATE network_applications SET
        status = ${status},
        reviewed_at = NOW(),
        reviewed_by = ${partnerUser.id},
        updated_at = NOW()
      WHERE id = ${applicationId}
      RETURNING id, status, reviewed_at
    `;

    return NextResponse.json({
      application: {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewed_at,
      },
    });
  } catch (error) {
    console.error('Update application status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
