/**
 * GET /api/student/rate-corporate?applicationId=... — Check if student already rated this application
 * POST /api/student/rate-corporate — Student rates a corporate partner (public rating)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const rateSchema = z.object({
  applicationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id, rating, review_text, created_at
      FROM corporate_ratings
      WHERE application_id = ${applicationId}
        AND student_id = ${session.data.userId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ rating: null });
    }

    const r = existing[0];
    return NextResponse.json({
      rating: {
        id: r.id,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
      },
    });
  } catch (error) {
    console.error('Check corporate rating error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = rateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { applicationId, rating, reviewText } = parsed.data;

    // Fetch application and verify student owns it and it is completed
    const apps = await sql`
      SELECT id, student_id, corporate_id, listing_id, listing_title, status
      FROM project_applications
      WHERE id = ${applicationId}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    if (app.student_id !== session.data.userId) {
      return NextResponse.json({ error: 'You can only rate applications you participated in' }, { status: 403 });
    }

    if (app.status !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed projects' }, { status: 400 });
    }

    // Check for existing rating
    const existing = await sql`
      SELECT id FROM corporate_ratings
      WHERE application_id = ${applicationId} AND student_id = ${session.data.userId}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'You have already rated this corporate partner for this project' }, { status: 409 });
    }

    // Insert the rating
    const result = await sql`
      INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
      VALUES (
        ${applicationId},
        ${session.data.userId},
        ${app.corporate_id},
        ${app.listing_id},
        ${app.listing_title},
        ${rating},
        ${reviewText || null}
      )
      RETURNING id, rating, review_text, created_at
    `;

    const newRating = result[0];

    // Get student name for notification
    const studentInfo = await sql`
      SELECT display_name, first_name, last_name FROM users WHERE id = ${session.data.userId}
    `;
    const studentName = studentInfo[0]?.display_name || `${studentInfo[0]?.first_name || ''} ${studentInfo[0]?.last_name || ''}`.trim() || 'A student';

    // Create notification to corporate partner
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${app.corporate_id},
        'rating_received',
        'New Rating',
        ${'You received a ' + rating + '-star rating from ' + studentName},
        ${JSON.stringify({ applicationId, ratingId: newRating.id, rating })}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      rating: {
        id: newRating.id,
        rating: newRating.rating,
        reviewText: newRating.review_text,
        createdAt: newRating.created_at,
      },
    });
  } catch (error) {
    console.error('Student rate-corporate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
