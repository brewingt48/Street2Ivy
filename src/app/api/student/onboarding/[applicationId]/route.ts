/**
 * GET /api/student/onboarding/:applicationId — Fetch onboarding details for a student's accepted application
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the application belongs to the student
    const apps = await sql`
      SELECT id, student_id FROM project_applications
      WHERE id = ${params.applicationId}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (apps[0].student_id !== session.data.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch onboarding details
    const details = await sql`
      SELECT * FROM onboarding_details
      WHERE application_id = ${params.applicationId}
    `;

    if (details.length === 0) {
      return NextResponse.json({ error: 'No onboarding details found for this application' }, { status: 404 });
    }

    const d = details[0];

    return NextResponse.json({
      onboarding: {
        id: d.id,
        applicationId: d.application_id,
        corporateId: d.corporate_id,
        studentId: d.student_id,
        workDescription: d.work_description,
        paymentInfo: d.payment_info,
        systemAccess: d.system_access,
        contactName: d.contact_name,
        contactEmail: d.contact_email,
        contactPhone: d.contact_phone,
        additionalNotes: d.additional_notes,
        createdAt: d.created_at,
      },
    });
  } catch (error) {
    console.error('Student onboarding fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
