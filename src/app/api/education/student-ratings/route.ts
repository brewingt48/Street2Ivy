/**
 * GET /api/education/student-ratings — View private ratings for a student (edu admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // Verify student belongs to admin's institution (same tenant)
    const studentCheck = await sql`
      SELECT id, tenant_id FROM users
      WHERE id = ${studentId} AND role = 'student'
    `;

    if (studentCheck.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Admin can see all students; edu admin must share tenant
    if (session.data.role === 'educational_admin') {
      const student = studentCheck[0];
      if (student.tenant_id !== session.data.tenantId) {
        return NextResponse.json({ error: 'Student does not belong to your institution' }, { status: 403 });
      }
    }

    // Fetch private ratings for this student
    const ratings = await sql`
      SELECT sr.id, sr.application_id, sr.corporate_id, sr.listing_id,
             sr.project_title, sr.rating, sr.review_text, sr.strengths,
             sr.areas_for_improvement, sr.recommend_for_future, sr.created_at,
             u.display_name as corporate_name
      FROM student_ratings sr
      LEFT JOIN users u ON u.id = sr.corporate_id
      WHERE sr.student_id = ${studentId}
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
    console.error('Education student-ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
