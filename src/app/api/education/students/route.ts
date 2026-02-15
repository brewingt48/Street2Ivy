/**
 * GET /api/education/students — List students for educational admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    let students;
    let total;

    if (q) {
      const pattern = `%${q}%`;
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major, u.graduation_year,
               u.gpa, u.is_active, u.created_at,
               (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id) as application_count
        FROM users u
        WHERE u.role = 'student'
          AND u.tenant_id = ${tenantId}
          AND (u.display_name ILIKE ${pattern} OR u.email ILIKE ${pattern} OR u.university ILIKE ${pattern})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users
        WHERE role = 'student'
          AND tenant_id = ${tenantId}
          AND (display_name ILIKE ${pattern} OR email ILIKE ${pattern} OR university ILIKE ${pattern})
      `;
      total = parseInt(countResult[0].count as string);
    } else {
      students = await sql`
        SELECT u.id, u.display_name, u.email, u.university, u.major, u.graduation_year,
               u.gpa, u.is_active, u.created_at,
               (SELECT COUNT(*) FROM project_applications pa WHERE pa.student_id = u.id) as application_count
        FROM users u
        WHERE u.role = 'student'
          AND u.tenant_id = ${tenantId}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users WHERE role = 'student' AND tenant_id = ${tenantId}
      `;
      total = parseInt(countResult[0].count as string);
    }

    return NextResponse.json({
      students: students.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.display_name,
        email: s.email,
        university: s.university,
        major: s.major,
        graduationYear: s.graduation_year,
        gpa: s.gpa,
        isActive: s.is_active,
        createdAt: s.created_at,
        applicationCount: parseInt(s.application_count as string),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Education students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
