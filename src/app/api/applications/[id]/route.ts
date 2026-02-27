/**
 * GET /api/applications/:id — Get application detail
 * PATCH /api/applications/:id — Update application (withdraw)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apps = await sql`
      SELECT pa.*
      FROM project_applications pa
      WHERE pa.id = ${params.id}
        AND (pa.student_id = ${session.data.userId} OR pa.corporate_id = ${session.data.userId})
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const a = apps[0];

    // Get application messages
    const messages = await sql`
      SELECT id, sender_id, sender_name, sender_role, content, message_type, read_at, created_at
      FROM application_messages
      WHERE application_id = ${params.id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      application: {
        id: a.id,
        studentId: a.student_id,
        listingId: a.listing_id,
        status: a.status,
        studentName: a.student_name,
        studentEmail: a.student_email,
        skills: a.skills,
        coverLetter: a.cover_letter,
        interestReason: a.interest_reason,
        relevantCoursework: a.relevant_coursework,
        availabilityDate: a.availability_date,
        hoursPerWeek: a.hours_per_week,
        gpa: a.gpa,
        referencesText: a.references_text,
        listingTitle: a.listing_title,
        corporateId: a.corporate_id,
        corporateName: a.corporate_name,
        rejectionReason: a.rejection_reason,
        reviewerNotes: a.reviewer_notes,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
        completedAt: a.completed_at,
      },
      messages: messages.map((m: Record<string, unknown>) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        content: m.content,
        messageType: m.message_type,
        readAt: m.read_at,
        createdAt: m.created_at,
      })),
    });
  } catch (error) {
    console.error('Application detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: string };

    // Student can withdraw their own application
    if (action === 'withdraw') {
      const result = await sql`
        UPDATE project_applications
        SET status = 'withdrawn', updated_at = NOW()
        WHERE id = ${params.id}
          AND student_id = ${session.data.userId}
          AND status = 'pending'
        RETURNING id, status
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Application not found or cannot be withdrawn' },
          { status: 404 }
        );
      }

      return NextResponse.json({ application: result[0] });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
