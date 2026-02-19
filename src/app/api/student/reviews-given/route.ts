/**
 * GET /api/student/reviews-given — List all reviews the student has given to corporate partners
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

    // Verify student role
    const users = await sql`SELECT role FROM users WHERE id = ${session.data.userId}`;
    if (users.length === 0 || users[0].role !== 'student') {
      return NextResponse.json({ error: 'Student access required' }, { status: 403 });
    }

    const ratings = await sql`
      SELECT cr.id, cr.application_id, cr.corporate_id, cr.listing_id,
             cr.project_title, cr.rating, cr.review_text, cr.created_at,
             u.display_name as corporate_name, u.company_name
      FROM corporate_ratings cr
      LEFT JOIN users u ON u.id = cr.corporate_id
      WHERE cr.student_id = ${session.data.userId}
      ORDER BY cr.created_at DESC
    `;

    return NextResponse.json({
      ratings: ratings.map((r: Record<string, unknown>) => ({
        id: r.id,
        applicationId: r.application_id,
        corporateId: r.corporate_id,
        listingId: r.listing_id,
        projectTitle: r.project_title,
        rating: r.rating,
        reviewText: r.review_text,
        corporateName: r.corporate_name,
        companyName: r.company_name,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Student reviews given error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
