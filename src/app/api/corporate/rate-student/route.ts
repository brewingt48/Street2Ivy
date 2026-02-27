/**
 * POST /api/corporate/rate-student — Corporate partner rates a student (private rating)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const rateSchema = z.object({
  applicationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
  strengths: z.string().max(2000).optional(),
  areasForImprovement: z.string().max(2000).optional(),
  recommendForFuture: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'corporate_partner') {
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

    const { applicationId, rating, reviewText, strengths, areasForImprovement, recommendForFuture } = parsed.data;

    // Fetch application and verify corporate owns it and it is completed
    const apps = await sql`
      SELECT id, student_id, corporate_id, listing_id, listing_title, status
      FROM project_applications
      WHERE id = ${applicationId}
    `;

    if (apps.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = apps[0];

    if (app.corporate_id !== session.data.userId) {
      return NextResponse.json({ error: 'You can only rate applications for your projects' }, { status: 403 });
    }

    if (app.status !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed projects' }, { status: 400 });
    }

    // Check for existing rating
    const existing = await sql`
      SELECT id FROM student_ratings
      WHERE application_id = ${applicationId} AND corporate_id = ${session.data.userId}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'You have already rated this student for this project' }, { status: 409 });
    }

    // Insert the rating
    const result = await sql`
      INSERT INTO student_ratings (
        application_id, student_id, corporate_id, listing_id, project_title,
        rating, review_text, strengths, areas_for_improvement, recommend_for_future
      )
      VALUES (
        ${applicationId},
        ${app.student_id},
        ${session.data.userId},
        ${app.listing_id},
        ${app.listing_title},
        ${rating},
        ${reviewText || null},
        ${strengths || null},
        ${areasForImprovement || null},
        ${recommendForFuture ?? false}
      )
      RETURNING id, rating, created_at
    `;

    const newRating = result[0];

    // Create notification to student
    const projectTitle = app.listing_title || 'a project';
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${app.student_id},
        'private_rating',
        'Performance Rating',
        ${'You received a private performance rating for "' + projectTitle + '"'},
        ${JSON.stringify({ applicationId, ratingId: newRating.id, projectTitle })}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      rating: {
        id: newRating.id,
        rating: newRating.rating,
        createdAt: newRating.created_at,
      },
    });
  } catch (error) {
    console.error('Corporate rate-student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
