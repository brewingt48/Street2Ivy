/**
 * GET /api/corporate/invites — List corporate's sent invites
 * POST /api/corporate/invites — Send an invite to a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const inviteSchema = z.object({
  studentId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const invites = await sql`
      SELECT id, student_id, student_name, student_email, student_university,
             listing_id, project_title, message, status, sent_at, responded_at
      FROM corporate_invites
      WHERE corporate_partner_id = ${session.data.userId}
      ORDER BY sent_at DESC
    `;

    return NextResponse.json({
      invites: invites.map((inv: Record<string, unknown>) => ({
        id: inv.id,
        studentId: inv.student_id,
        studentName: inv.student_name,
        studentEmail: inv.student_email,
        studentUniversity: inv.student_university,
        listingId: inv.listing_id,
        projectTitle: inv.project_title,
        message: inv.message,
        status: inv.status,
        sentAt: inv.sent_at,
        respondedAt: inv.responded_at,
      })),
    });
  } catch (error) {
    console.error('Invites list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Only corporate partners can send invites' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get student info
    const students = await sql`
      SELECT id, first_name, last_name, display_name, email, university
      FROM users WHERE id = ${data.studentId} AND role = 'student'
    `;

    if (students.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = students[0];

    // Check for existing pending invite
    const existing = await sql`
      SELECT id FROM corporate_invites
      WHERE corporate_partner_id = ${session.data.userId}
        AND student_id = ${data.studentId}
        AND status = 'pending'
        ${data.listingId ? sql`AND listing_id = ${data.listingId}` : sql``}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'An invite is already pending for this student' }, { status: 409 });
    }

    // Get listing title if listingId provided
    let projectTitle = null;
    if (data.listingId) {
      const listings = await sql`
        SELECT title FROM listings WHERE id = ${data.listingId} AND author_id = ${session.data.userId}
      `;
      if (listings.length > 0) {
        projectTitle = listings[0].title;
      }
    }

    const result = await sql`
      INSERT INTO corporate_invites (
        corporate_partner_id, student_id, student_name, student_email,
        student_university, listing_id, project_title, message
      ) VALUES (
        ${session.data.userId},
        ${data.studentId},
        ${student.display_name || student.first_name + ' ' + student.last_name},
        ${student.email},
        ${student.university || null},
        ${data.listingId || null},
        ${projectTitle},
        ${data.message}
      )
      RETURNING id, status, sent_at
    `;

    // Notify the student
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${data.studentId},
        'invite_received',
        'New Project Invitation',
        ${'You have received an invitation' + (projectTitle ? ' for "' + projectTitle + '"' : '')},
        ${JSON.stringify({ inviteId: result[0].id, projectTitle })}::jsonb
      )
    `;

    return NextResponse.json({ invite: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Invite send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
