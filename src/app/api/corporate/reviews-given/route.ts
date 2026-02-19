/**
 * GET /api/corporate/reviews-given — List all reviews/feedback the corporate has given to students
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const users = await sql`SELECT role FROM users WHERE id = ${session.data.userId}`;
    if (users.length === 0 || users[0].role !== 'corporate_partner') {
      return NextResponse.json({ error: 'Corporate access required' }, { status: 403 });
    }

    // Get assessments (feedback given on project completion)
    const assessments = await sql`
      SELECT a.id, a.assessment_id, a.application_id, a.student_id, a.student_name,
             a.project_title, a.overall_average, a.overall_comments,
             a.strengths, a.areas_for_improvement, a.recommend_for_future,
             a.created_at
      FROM assessments a
      WHERE a.assessor_id = ${session.data.userId}
      ORDER BY a.created_at DESC
    `;

    // Get private student ratings
    const privateRatings = await sql`
      SELECT sr.id, sr.application_id, sr.student_id, sr.listing_id,
             sr.project_title, sr.rating, sr.review_text,
             sr.strengths, sr.areas_for_improvement, sr.recommend_for_future,
             sr.created_at,
             u.display_name as student_name
      FROM student_ratings sr
      LEFT JOIN users u ON u.id = sr.student_id
      WHERE sr.corporate_id = ${session.data.userId}
      ORDER BY sr.created_at DESC
    `;

    return NextResponse.json({
      assessments: assessments.map((a: Record<string, unknown>) => ({
        id: a.id,
        assessmentId: a.assessment_id,
        applicationId: a.application_id,
        studentId: a.student_id,
        studentName: a.student_name,
        projectTitle: a.project_title,
        overallAverage: a.overall_average,
        overallComments: a.overall_comments,
        strengths: a.strengths,
        areasForImprovement: a.areas_for_improvement,
        recommendForFuture: a.recommend_for_future,
        createdAt: a.created_at,
      })),
      privateRatings: privateRatings.map((r: Record<string, unknown>) => ({
        id: r.id,
        applicationId: r.application_id,
        studentId: r.student_id,
        listingId: r.listing_id,
        projectTitle: r.project_title,
        rating: r.rating,
        reviewText: r.review_text,
        strengths: r.strengths,
        areasForImprovement: r.areas_for_improvement,
        recommendForFuture: r.recommend_for_future,
        studentName: r.student_name,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Corporate reviews given error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
