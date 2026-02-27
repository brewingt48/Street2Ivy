/**
 * GET /api/education/outcomes/students — Student-level drill-down
 *
 * Returns individual student data for the institution, paginated:
 * - name, email, projects completed count, latest readiness score, badges count
 *
 * Query params: page, limit, sortBy, sortOrder
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';

const ALLOWED_SORT_FIELDS = ['name', 'projects_completed', 'readiness_score'] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const;
type SortOrder = (typeof ALLOWED_SORT_ORDERS)[number];

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'outcomesDashboard');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Outcomes Dashboard requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const sortByParam = searchParams.get('sortBy') || 'name';
    const sortOrderParam = searchParams.get('sortOrder') || 'asc';

    const sortBy: SortField = ALLOWED_SORT_FIELDS.includes(sortByParam as SortField)
      ? (sortByParam as SortField)
      : 'name';
    const sortOrder: SortOrder = ALLOWED_SORT_ORDERS.includes(sortOrderParam as SortOrder)
      ? (sortOrderParam as SortOrder)
      : 'asc';

    // Total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM users u
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
    `;
    const total = parseInt(countResult[0].count as string);

    // Build query based on sort field and order
    // Using separate queries per sort to avoid SQL injection with dynamic ORDER BY
    let students;

    if (sortBy === 'name' && sortOrder === 'asc') {
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY u.last_name ASC, u.first_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'name' && sortOrder === 'desc') {
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY u.last_name DESC, u.first_name DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'projects_completed' && sortOrder === 'asc') {
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY projects_completed ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'projects_completed' && sortOrder === 'desc') {
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY projects_completed DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'readiness_score' && sortOrder === 'asc') {
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY readiness_score ASC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // readiness_score desc (default fallback)
      students = await sql`
        SELECT u.id, u.first_name, u.last_name, u.email,
          (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id AND pa.status = 'completed') as projects_completed,
          (SELECT overall_readiness_score FROM skill_gap_snapshots sgs WHERE sgs.student_id = u.id ORDER BY snapshot_date DESC LIMIT 1) as readiness_score,
          (SELECT COUNT(*) FROM portfolio_badges pb WHERE pb.student_id = u.id) as badges_count
        FROM users u
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
        ORDER BY readiness_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      students: students.map((r: Record<string, unknown>) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        projectsCompleted: parseInt(r.projects_completed as string),
        readinessScore: r.readiness_score ? parseFloat(r.readiness_score as string) : null,
        badgesCount: parseInt(r.badges_count as string),
      })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Students outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
