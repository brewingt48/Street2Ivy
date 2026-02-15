/**
 * GET /api/education/dashboard — Education admin dashboard stats
 * Properly scoped by tenant_id for multi-tenant isolation.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getTenantFeatures, checkFeature } from '@/lib/tenant/features';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;

    // Get tenant features for feature gating
    const features = tenantId ? await getTenantFeatures(tenantId) : {};
    const hasAdvancedReporting = !tenantId || checkFeature(features, 'advancedReporting');
    const hasStudentRatings = !tenantId || checkFeature(features, 'studentRatings');

    // All queries scoped by tenant_id
    const totalStudents = await sql`
      SELECT COUNT(*) as count FROM users
      WHERE role = 'student' AND is_active = true
        ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
    `;

    const activeProjects = await sql`
      SELECT COUNT(*) as count FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE pa.status = 'accepted'
        ${tenantId ? sql`AND u.tenant_id = ${tenantId}` : sql``}
    `;

    const completedProjects = await sql`
      SELECT COUNT(*) as count FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE pa.status = 'completed'
        ${tenantId ? sql`AND u.tenant_id = ${tenantId}` : sql``}
    `;

    const waitlistCount = await sql`
      SELECT COUNT(*) as count FROM student_waitlist
      WHERE contacted = false
        ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
    `;

    // Average student performance rating (gated by studentRatings feature)
    let avgPerformance = [{ avg_rating: null, total_ratings: '0', rated_students: '0' }];
    let topStudents: Record<string, unknown>[] = [];

    if (hasStudentRatings) {
      avgPerformance = await sql`
        SELECT
          AVG(sr.rating)::numeric(3,2) as avg_rating,
          COUNT(*) as total_ratings,
          COUNT(DISTINCT sr.student_id) as rated_students
        FROM student_ratings sr
        JOIN users u ON u.id = sr.student_id
        WHERE 1=1
          ${tenantId ? sql`AND u.tenant_id = ${tenantId}` : sql``}
      `;
    }

    // Top performing students (gated by advancedReporting feature)
    if (hasAdvancedReporting) {
      topStudents = await sql`
        SELECT u.id, u.display_name, u.email, u.university,
               AVG(sr.rating)::numeric(3,2) as avg_rating,
               COUNT(sr.id) as rating_count
        FROM student_ratings sr
        JOIN users u ON u.id = sr.student_id
        WHERE 1=1
          ${tenantId ? sql`AND u.tenant_id = ${tenantId}` : sql``}
        GROUP BY u.id, u.display_name, u.email, u.university
        HAVING COUNT(sr.id) >= 1
        ORDER BY AVG(sr.rating) DESC
        LIMIT 5
      `;
    }

    const recentStudents = await sql`
      SELECT id, display_name, email, university, created_at
      FROM users WHERE role = 'student' AND is_active = true
        ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
      ORDER BY created_at DESC LIMIT 5
    `;

    return NextResponse.json({
      stats: {
        totalStudents: parseInt(totalStudents[0].count as string),
        activeProjects: parseInt(activeProjects[0].count as string),
        completedProjects: parseInt(completedProjects[0].count as string),
        waitlistCount: parseInt(waitlistCount[0].count as string),
        avgStudentRating: hasStudentRatings && avgPerformance[0]?.avg_rating ? Number(avgPerformance[0].avg_rating) : null,
        totalStudentRatings: hasStudentRatings ? (parseInt(avgPerformance[0]?.total_ratings as string) || 0) : 0,
        ratedStudents: hasStudentRatings ? (parseInt(avgPerformance[0]?.rated_students as string) || 0) : 0,
      },
      features: {
        advancedReporting: hasAdvancedReporting,
        studentRatings: hasStudentRatings,
      },
      recentStudents: recentStudents.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.display_name,
        email: s.email,
        university: s.university,
        createdAt: s.created_at,
      })),
      topStudents: hasAdvancedReporting ? topStudents.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.display_name,
        email: s.email,
        university: s.university,
        avgRating: Number(s.avg_rating),
        ratingCount: parseInt(s.rating_count as string),
      })) : [],
    });
  } catch (error) {
    console.error('Education dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
