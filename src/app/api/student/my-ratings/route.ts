/**
 * GET /api/student/my-ratings — List private ratings received by the current student
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const ratings = await sql`
      SELECT sr.id, sr.application_id, sr.corporate_id, sr.listing_id,
             sr.project_title, sr.rating, sr.review_text, sr.strengths,
             sr.areas_for_improvement, sr.recommend_for_future, sr.created_at,
             u.display_name as corporate_name
      FROM student_ratings sr
      LEFT JOIN users u ON u.id = sr.corporate_id
      WHERE sr.student_id = ${session.data.userId}
      ORDER BY sr.created_at DESC
    `;

    return NextResponse.json({
      ratings: ratings.map((r: Record<string, unknown>) => ({
        id: r.id,
        applicationId: r.application_id,
        corporateId: r.corporate_id,
        corporateName: r.corporate_name,
        listingId: r.listing_id,
        projectTitle: r.project_title,
        rating: r.rating,
        reviewText: r.review_text,
        strengths: r.strengths,
        areasForImprovement: r.areas_for_improvement,
        recommendForFuture: r.recommend_for_future,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Student my-ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
