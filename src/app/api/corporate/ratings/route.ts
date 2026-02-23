/**
 * GET /api/corporate/ratings — Public ratings for a corporate partner
 * Pass ?corporateId=... for any corporate, or omit for session-based (own ratings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { filterByDirectoryPreferences } from '@/lib/auth/ferpa-gate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let corporateId = searchParams.get('corporateId');

    // If no corporateId provided, use the current session user
    if (!corporateId) {
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json({ error: 'corporateId is required or must be authenticated' }, { status: 400 });
      }
      corporateId = session.data.userId;
    }

    // Get individual ratings with student display names
    const ratings = await sql`
      SELECT cr.id, cr.application_id, cr.student_id, cr.corporate_id,
             cr.listing_id, cr.project_title, cr.rating, cr.review_text,
             cr.created_at,
             u.display_name as student_name
      FROM corporate_ratings cr
      LEFT JOIN users u ON u.id = cr.student_id
      WHERE cr.corporate_id = ${corporateId}
      ORDER BY cr.created_at DESC
    `;

    // Compute aggregate stats
    const stats = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg, COUNT(*) as count
      FROM corporate_ratings
      WHERE corporate_id = ${corporateId}
    `;

    const avg = stats[0]?.avg ? Number(stats[0].avg) : null;
    const count = parseInt(stats[0]?.count as string) || 0;

    // Apply FERPA directory preference filtering to student names in ratings
    const filteredRatings = await Promise.all(
      ratings.map(async (r: Record<string, unknown>) => {
        const studentId = r.student_id as string;
        const studentData: Record<string, unknown> = {
          id: studentId,
          displayName: r.student_name,
        };
        const filtered = await filterByDirectoryPreferences(studentId, studentData);

        return {
          id: r.id,
          applicationId: r.application_id,
          studentId: r.student_id,
          studentName: filtered.displayName || 'Student',
          corporateId: r.corporate_id,
          listingId: r.listing_id,
          projectTitle: r.project_title,
          rating: r.rating,
          reviewText: r.review_text,
          createdAt: r.created_at,
        };
      })
    );

    return NextResponse.json({
      ratings: filteredRatings,
      average: avg,
      count,
    });
  } catch (error) {
    console.error('Corporate ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
