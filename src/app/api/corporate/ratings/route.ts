/**
 * GET /api/corporate/ratings — Public ratings for a corporate partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const corporateId = searchParams.get('corporateId');

    if (!corporateId) {
      return NextResponse.json({ error: 'corporateId is required' }, { status: 400 });
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

    return NextResponse.json({
      ratings: ratings.map((r: Record<string, unknown>) => ({
        id: r.id,
        applicationId: r.application_id,
        studentId: r.student_id,
        studentName: r.student_name,
        corporateId: r.corporate_id,
        listingId: r.listing_id,
        projectTitle: r.project_title,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
      })),
      average: avg,
      count,
    });
  } catch (error) {
    console.error('Corporate ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
