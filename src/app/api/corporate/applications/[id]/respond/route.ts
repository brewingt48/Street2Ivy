/**
 * POST /api/corporate/applications/:id/respond — Accept, decline, or complete an application
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import crypto from 'crypto';

const respondSchema = z.object({
  action: z.enum(['accept', 'decline', 'complete']),
  rejectionReason: z.string().max(2000).optional(),
  reviewerNotes: z.string().max(2000).optional(),
  onboarding: z.object({
    workDescription: z.string().min(1).max(5000),
    paymentInfo: z.string().min(1).max(2000),
    systemAccess: z.string().min(1).max(2000),
    contactName: z.string().min(1).max(200),
    contactEmail: z.string().email().max(200),
    contactPhone: z.string().max(50).optional(),
    additionalNotes: z.string().max(5000).optional(),
  }).optional(),
  feedback: z.object({
    overallRating: z.number().int().min(1).max(5),
    overallComments: z.string().min(1).max(5000),
    strengths: z.string().max(5000).optional(),
    areasForImprovement: z.string().max(5000).optional(),
    recommendForFuture: z.boolean().optional(),
  }).optional(),
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

    const { action, rejectionReason, reviewerNotes, onboarding, feedback } = parsed.data;

    // Verify ownership and fetch application details including student name
    const apps = await sql`
      SELECT pa.id, pa.status, pa.student_id, pa.listing_title, pa.corporate_id,
             pa.student_name
      FROM project_applications pa
      WHERE pa.id = ${params.id} AND pa.corporate_id = ${session.data.userId}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    // Fetch the corporate user's display name and company name
    const corporateUsers = await sql`
      SELECT display_name, company_name FROM users WHERE id = ${session.data.userId}
    `;
    const corporateUser = corporateUsers.length > 0 ? corporateUsers[0] : null;

    let result;

    switch (action) {
      case 'accept': {
        if (app.status !== 'pending') {
          return NextResponse.json({ error: 'Can only accept pending applications' }, { status: 400 });
        }
        if (!onboarding) {
          return NextResponse.json({ error: 'Onboarding details are required when accepting an application' }, { status: 400 });
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
        // Insert onboarding details
        await sql`
          INSERT INTO onboarding_details (application_id, corporate_id, student_id, work_description, payment_info, system_access, contact_name, contact_email, contact_phone, additional_notes)
          VALUES (${params.id}, ${app.corporate_id}, ${app.student_id}, ${onboarding.workDescription}, ${onboarding.paymentInfo}, ${onboarding.systemAccess}, ${onboarding.contactName}, ${onboarding.contactEmail}, ${onboarding.contactPhone || null}, ${onboarding.additionalNotes || null})
        `;
        // Create notification for student
        await sql`
          INSERT INTO notifications (recipient_id, type, subject, content, data)
          VALUES (
            ${app.student_id},
            'application_accepted',
            'Application Accepted',
            ${'Your application for "' + app.listing_title + '" has been accepted! Onboarding details: Contact ' + onboarding.contactName + ' at ' + onboarding.contactEmail + '.'},
            ${JSON.stringify({ applicationId: params.id, listingTitle: app.listing_title })}::jsonb
          )
        `;
        break;
      }

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

      case 'complete': {
        if (app.status !== 'accepted') {
          return NextResponse.json({ error: 'Can only complete accepted applications' }, { status: 400 });
        }
        if (!feedback) {
          return NextResponse.json({ error: 'Feedback is required when completing a project' }, { status: 400 });
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
        // Insert assessment/feedback
        const assessmentId = crypto.randomUUID();
        const studentName = app.student_name || 'Student';
        const assessorName = corporateUser?.display_name || 'Corporate Partner';
        const companyName = corporateUser?.company_name || '';
        await sql`
          INSERT INTO assessments (assessment_id, student_id, assessor_id, student_name, assessor_name, company_name, project_title, overall_average, overall_comments, strengths, areas_for_improvement, recommend_for_future, sent_to_student, application_id)
          VALUES (${assessmentId}::uuid, ${app.student_id}, ${session.data.userId}, ${studentName}, ${assessorName}, ${companyName}, ${app.listing_title}, ${feedback.overallRating}, ${feedback.overallComments}, ${feedback.strengths || ''}, ${feedback.areasForImprovement || ''}, ${feedback.recommendForFuture || false}, true, ${params.id})
        `;
        // Create notification for student
        await sql`
          INSERT INTO notifications (recipient_id, type, subject, content, data)
          VALUES (
            ${app.student_id},
            'project_completed',
            'Project Completed',
            ${'Your project "' + app.listing_title + '" has been completed! Your feedback is ready to view.'},
            ${JSON.stringify({ applicationId: params.id, listingTitle: app.listing_title })}::jsonb
          )
        `;
        break;
      }
    }

    return NextResponse.json({ application: result![0] });
  } catch (error) {
    console.error('Application respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
