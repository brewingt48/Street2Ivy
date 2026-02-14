/**
 * GET /api/corporate/applications — List applications to corporate's listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const listingId = searchParams.get('listing_id') || '';

    let applications;

    if (status && listingId) {
      applications = await sql`
        SELECT pa.id, pa.student_id, pa.student_name, pa.student_email,
               pa.status, pa.listing_id, pa.listing_title, pa.cover_letter,
               pa.skills, pa.gpa, pa.hours_per_week, pa.interest_reason,
               pa.relevant_coursework, pa.availability_date,
               pa.submitted_at, pa.responded_at, pa.initiated_by
        FROM project_applications pa
        WHERE pa.corporate_id = ${session.data.userId}
          AND pa.status = ${status}
          AND pa.listing_id = ${listingId}
        ORDER BY pa.submitted_at DESC
      `;
    } else if (status) {
      applications = await sql`
        SELECT pa.id, pa.student_id, pa.student_name, pa.student_email,
               pa.status, pa.listing_id, pa.listing_title, pa.cover_letter,
               pa.skills, pa.gpa, pa.hours_per_week, pa.interest_reason,
               pa.relevant_coursework, pa.availability_date,
               pa.submitted_at, pa.responded_at, pa.initiated_by
        FROM project_applications pa
        WHERE pa.corporate_id = ${session.data.userId}
          AND pa.status = ${status}
        ORDER BY pa.submitted_at DESC
      `;
    } else if (listingId) {
      applications = await sql`
        SELECT pa.id, pa.student_id, pa.student_name, pa.student_email,
               pa.status, pa.listing_id, pa.listing_title, pa.cover_letter,
               pa.skills, pa.gpa, pa.hours_per_week, pa.interest_reason,
               pa.relevant_coursework, pa.availability_date,
               pa.submitted_at, pa.responded_at, pa.initiated_by
        FROM project_applications pa
        WHERE pa.corporate_id = ${session.data.userId}
          AND pa.listing_id = ${listingId}
        ORDER BY pa.submitted_at DESC
      `;
    } else {
      applications = await sql`
        SELECT pa.id, pa.student_id, pa.student_name, pa.student_email,
               pa.status, pa.listing_id, pa.listing_title, pa.cover_letter,
               pa.skills, pa.gpa, pa.hours_per_week, pa.interest_reason,
               pa.relevant_coursework, pa.availability_date,
               pa.submitted_at, pa.responded_at, pa.initiated_by
        FROM project_applications pa
        WHERE pa.corporate_id = ${session.data.userId}
        ORDER BY pa.submitted_at DESC
      `;
    }

    // Get status counts
    const counts = await sql`
      SELECT status, COUNT(*) as count
      FROM project_applications
      WHERE corporate_id = ${session.data.userId}
      GROUP BY status
    `;

    return NextResponse.json({
      applications: applications.map((a: Record<string, unknown>) => ({
        id: a.id,
        studentId: a.student_id,
        studentName: a.student_name,
        studentEmail: a.student_email,
        status: a.status,
        listingId: a.listing_id,
        listingTitle: a.listing_title,
        coverLetter: a.cover_letter,
        skills: a.skills,
        gpa: a.gpa,
        hoursPerWeek: a.hours_per_week,
        interestReason: a.interest_reason,
        relevantCoursework: a.relevant_coursework,
        availabilityDate: a.availability_date,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
        initiatedBy: a.initiated_by,
      })),
      counts: Object.fromEntries(
        counts.map((c: Record<string, unknown>) => [c.status as string, parseInt(c.count as string)])
      ),
    });
  } catch (error) {
    console.error('Corporate applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
