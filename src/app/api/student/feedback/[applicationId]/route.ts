/**
 * GET /api/student/feedback/:applicationId — Fetch assessment/feedback for a student's completed application
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

    // Fetch assessment/feedback
    const assessments = await sql`
      SELECT * FROM assessments
      WHERE application_id = ${params.applicationId}
    `;

    if (assessments.length === 0) {
      return NextResponse.json({ error: 'No feedback found for this application' }, { status: 404 });
    }

    const a = assessments[0];

    return NextResponse.json({
      feedback: {
        id: a.id,
        assessmentId: a.assessment_id,
        studentId: a.student_id,
        studentName: a.student_name,
        assessorId: a.assessor_id,
        assessorName: a.assessor_name,
        companyName: a.company_name,
        projectTitle: a.project_title,
        overallAverage: a.overall_average,
        overallComments: a.overall_comments,
        strengths: a.strengths,
        areasForImprovement: a.areas_for_improvement,
        recommendForFuture: a.recommend_for_future,
        sentToStudent: a.sent_to_student,
        applicationId: a.application_id,
        createdAt: a.created_at,
      },
    });
  } catch (error) {
    console.error('Student feedback fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
