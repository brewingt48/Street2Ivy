/**
 * GET /api/applications — List current user's applications
 * POST /api/applications — Submit a new application to a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const applicationSchema = z.object({
  listingId: z.string().uuid(),
  coverLetter: z.string().max(5000).optional(),
  interestReason: z.string().max(2000).optional(),
  relevantCoursework: z.string().max(1000).optional(),
  availabilityDate: z.string().max(100).optional(),
  hoursPerWeek: z.number().int().min(1).max(80).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let applications;
    if (status) {
      applications = await sql`
        SELECT
          pa.id, pa.status, pa.cover_letter, pa.submitted_at, pa.responded_at,
          pa.listing_id, pa.listing_title, pa.corporate_name,
          pa.interest_reason, pa.hours_per_week
        FROM project_applications pa
        WHERE pa.student_id = ${session.data.userId}
          AND pa.status = ${status}
        ORDER BY pa.submitted_at DESC
      `;
    } else {
      applications = await sql`
        SELECT
          pa.id, pa.status, pa.cover_letter, pa.submitted_at, pa.responded_at,
          pa.listing_id, pa.listing_title, pa.corporate_name,
          pa.interest_reason, pa.hours_per_week
        FROM project_applications pa
        WHERE pa.student_id = ${session.data.userId}
        ORDER BY pa.submitted_at DESC
      `;
    }

    // Get status counts
    const counts = await sql`
      SELECT status, COUNT(*) as count
      FROM project_applications
      WHERE student_id = ${session.data.userId}
      GROUP BY status
    `;

    return NextResponse.json({
      applications: applications.map((a: Record<string, unknown>) => ({
        id: a.id,
        status: a.status,
        coverLetter: a.cover_letter,
        submittedAt: a.submitted_at,
        respondedAt: a.responded_at,
        listingId: a.listing_id,
        listingTitle: a.listing_title,
        corporateName: a.corporate_name,
        interestReason: a.interest_reason,
        hoursPerWeek: a.hours_per_week,
      })),
      counts: Object.fromEntries(
        counts.map((c: Record<string, unknown>) => [c.status as string, parseInt(c.count as string)])
      ),
    });
  } catch (error) {
    console.error('Applications list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit applications' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = applicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check listing exists and is published
    const listings = await sql`
      SELECT l.id, l.title, l.max_applicants, l.author_id,
             u.id as corp_id, u.display_name as corp_name, u.email as corp_email
      FROM listings l
      JOIN users u ON u.id = l.author_id
      WHERE l.id = ${data.listingId} AND l.status = 'published'
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Project not found or not accepting applications' }, { status: 404 });
    }

    const listing = listings[0];

    // Check if already applied
    const existing = await sql`
      SELECT id FROM project_applications
      WHERE student_id = ${session.data.userId} AND listing_id = ${data.listingId}
        AND status NOT IN ('withdrawn', 'cancelled')
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'You have already applied to this project' }, { status: 409 });
    }

    // Check max applicants
    if (listing.max_applicants) {
      const appCount = await sql`
        SELECT COUNT(*) as count FROM project_applications
        WHERE listing_id = ${data.listingId} AND status NOT IN ('withdrawn', 'cancelled')
      `;
      if (parseInt(appCount[0].count) >= listing.max_applicants) {
        return NextResponse.json({ error: 'This project has reached its maximum number of applicants' }, { status: 409 });
      }
    }

    // Get student info
    const students = await sql`
      SELECT first_name, last_name, display_name, email, gpa
      FROM users WHERE id = ${session.data.userId}
    `;
    const student = students[0];

    // Get student skills
    const skills = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${session.data.userId}
    `;
    const skillNames = skills.map((s: Record<string, unknown>) => s.name as string);

    // Create application
    const result = await sql`
      INSERT INTO project_applications (
        student_id, listing_id, status,
        student_name, student_email, skills,
        cover_letter, interest_reason, relevant_coursework,
        availability_date, hours_per_week, gpa,
        listing_title, corporate_id, corporate_name, corporate_email,
        initiated_by
      ) VALUES (
        ${session.data.userId}, ${data.listingId}, 'pending',
        ${student.display_name || student.first_name + ' ' + student.last_name},
        ${student.email}, ${JSON.stringify(skillNames)}::jsonb,
        ${data.coverLetter || null}, ${data.interestReason || null}, ${data.relevantCoursework || null},
        ${data.availabilityDate || null}, ${data.hoursPerWeek || null}, ${student.gpa || null},
        ${listing.title}, ${listing.corp_id}, ${listing.corp_name}, ${listing.corp_email},
        'student'
      )
      RETURNING id, status, submitted_at
    `;

    const application = result[0];

    return NextResponse.json(
      {
        application: {
          id: application.id,
          status: application.status,
          submittedAt: application.submitted_at,
          listingTitle: listing.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Application submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
