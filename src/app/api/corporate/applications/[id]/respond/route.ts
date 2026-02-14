/**
 * POST /api/corporate/applications/:id/respond — Accept, decline, or complete an application
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const respondSchema = z.object({
  action: z.enum(['accept', 'decline', 'complete']),
  rejectionReason: z.string().max(2000).optional(),
  reviewerNotes: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, rejectionReason, reviewerNotes } = parsed.data;

    // Verify ownership
    const apps = await sql`
      SELECT id, status, student_id, listing_title
      FROM project_applications
      WHERE id = ${params.id} AND corporate_id = ${session.data.userId}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    let result;

    switch (action) {
      case 'accept':
        if (app.status !== 'pending') {
          return NextResponse.json({ error: 'Can only accept pending applications' }, { status: 400 });
        }
        result = await sql`
          UPDATE project_applications
          SET status = 'accepted',
              responded_at = NOW(),
              reviewer_notes = ${reviewerNotes || null},
              updated_at = NOW()
          WHERE id = ${params.id}
          RETURNING id, status, responded_at
        `;
        // Create notification for student
        await sql`
          INSERT INTO notifications (recipient_id, type, subject, content, data)
          VALUES (
            ${app.student_id},
            'application_accepted',
            'Application Accepted',
            ${'Your application for "' + app.listing_title + '" has been accepted!'},
            ${JSON.stringify({ applicationId: params.id, listingTitle: app.listing_title })}::jsonb
          )
        `;
        break;

      case 'decline':
        if (app.status !== 'pending') {
          return NextResponse.json({ error: 'Can only decline pending applications' }, { status: 400 });
        }
        result = await sql`
          UPDATE project_applications
          SET status = 'rejected',
              responded_at = NOW(),
              rejection_reason = ${rejectionReason || null},
              reviewer_notes = ${reviewerNotes || null},
              updated_at = NOW()
          WHERE id = ${params.id}
          RETURNING id, status, responded_at
        `;
        // Create notification for student
        await sql`
          INSERT INTO notifications (recipient_id, type, subject, content, data)
          VALUES (
            ${app.student_id},
            'application_rejected',
            'Application Update',
            ${'Your application for "' + app.listing_title + '" was not selected.'},
            ${JSON.stringify({ applicationId: params.id, listingTitle: app.listing_title })}::jsonb
          )
        `;
        break;

      case 'complete':
        if (app.status !== 'accepted') {
          return NextResponse.json({ error: 'Can only complete accepted applications' }, { status: 400 });
        }
        result = await sql`
          UPDATE project_applications
          SET status = 'completed',
              completed_at = NOW(),
              reviewer_notes = ${reviewerNotes || null},
              updated_at = NOW()
          WHERE id = ${params.id}
          RETURNING id, status, completed_at
        `;
        // Create notification for student
        await sql`
          INSERT INTO notifications (recipient_id, type, subject, content, data)
          VALUES (
            ${app.student_id},
            'project_completed',
            'Project Completed',
            ${'Your project "' + app.listing_title + '" has been marked as completed!'},
            ${JSON.stringify({ applicationId: params.id, listingTitle: app.listing_title })}::jsonb
          )
        `;
        break;
    }

    return NextResponse.json({ application: result![0] });
  } catch (error) {
    console.error('Application respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
