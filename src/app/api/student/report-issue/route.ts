/**
 * POST /api/student/report-issue — Submit an issue report about a corporate partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const reportSchema = z.object({
  corporateId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  category: z.enum(['safety', 'harassment', 'payment', 'communication', 'discrimination', 'other']),
  subject: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Only students can report issues' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get student info
    const students = await sql`
      SELECT display_name, institution_domain, tenant_id
      FROM users WHERE id = ${session.data.userId}
    `;

    if (students.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = students[0];
    const studentName = student.display_name || 'Student';

    // Get corporate info
    const corporates = await sql`
      SELECT display_name FROM users WHERE id = ${data.corporateId}
    `;

    if (corporates.length === 0) {
      return NextResponse.json({ error: 'Corporate partner not found' }, { status: 404 });
    }

    const corporateName = corporates[0].display_name || 'Corporate Partner';

    // Insert issue report
    const result = await sql`
      INSERT INTO issue_reports (
        reporter_id, reporter_name, reported_entity_id, reported_entity_name,
        application_id, category, subject, description,
        tenant_id, institution_domain
      ) VALUES (
        ${session.data.userId}, ${studentName}, ${data.corporateId}, ${corporateName},
        ${data.applicationId || null}, ${data.category}, ${data.subject}, ${data.description},
        ${student.tenant_id}, ${student.institution_domain}
      )
      RETURNING id
    `;

    const reportId = result[0].id;

    // Find edu admins for this student's institution
    const eduAdmins = await sql`
      SELECT id FROM users
      WHERE role = 'educational_admin'
        AND institution_domain = ${student.institution_domain}
    `;

    // Create notification for each edu admin
    for (const admin of eduAdmins) {
      await sql`
        INSERT INTO notifications (recipient_id, type, subject, content, data)
        VALUES (
          ${admin.id},
          'issue_reported',
          ${'Issue Report: ' + data.category},
          ${studentName + ' has reported a ' + data.category + ' issue regarding ' + corporateName},
          ${JSON.stringify({ reportId, category: data.category, reporterName: studentName, corporateName })}::jsonb
        )
      `;
    }

    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    console.error('Report issue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
