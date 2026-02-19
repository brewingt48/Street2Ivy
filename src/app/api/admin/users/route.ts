/**
 * GET /api/admin/users — List all users (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const role = searchParams.get('role') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    let users;
    let total;

    if (q && role) {
      const pattern = `%${q}%`;
      users = await sql`
        SELECT id, display_name, email, role, is_active, email_verified, university,
               company_name, created_at, last_login_at, metadata
        FROM users
        WHERE (display_name ILIKE ${pattern} OR email ILIKE ${pattern})
          AND role = ${role}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users
        WHERE (display_name ILIKE ${pattern} OR email ILIKE ${pattern}) AND role = ${role}
      `;
      total = parseInt(countResult[0].count as string);
    } else if (q) {
      const pattern = `%${q}%`;
      users = await sql`
        SELECT id, display_name, email, role, is_active, email_verified, university,
               company_name, created_at, last_login_at, metadata
        FROM users
        WHERE display_name ILIKE ${pattern} OR email ILIKE ${pattern}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users
        WHERE display_name ILIKE ${pattern} OR email ILIKE ${pattern}
      `;
      total = parseInt(countResult[0].count as string);
    } else if (role) {
      users = await sql`
        SELECT id, display_name, email, role, is_active, email_verified, university,
               company_name, created_at, last_login_at, metadata
        FROM users WHERE role = ${role}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM users WHERE role = ${role}`;
      total = parseInt(countResult[0].count as string);
    } else {
      users = await sql`
        SELECT id, display_name, email, role, is_active, email_verified, university,
               company_name, created_at, last_login_at, metadata
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
      total = parseInt(countResult[0].count as string);
    }

    // Get ratings for corporate partners in this page
    const corporateIds = users
      .filter((u: Record<string, unknown>) => u.role === 'corporate_partner')
      .map((u: Record<string, unknown>) => u.id as string);

    let ratingsMap: Record<string, { avg: number; count: number }> = {};
    if (corporateIds.length > 0) {
      const ratings = await sql`
        SELECT assessor_id, AVG(overall_average) as avg_rating, COUNT(*) as rating_count
        FROM assessments
        WHERE assessor_id = ANY(${corporateIds})
          AND overall_average IS NOT NULL
        GROUP BY assessor_id
      `;
      ratingsMap = Object.fromEntries(
        ratings.map((r: Record<string, unknown>) => [
          r.assessor_id as string,
          { avg: Number(r.avg_rating), count: Number(r.rating_count) },
        ])
      );
    }

    return NextResponse.json({
      users: users.map((u: Record<string, unknown>) => {
        const metadata = (u.metadata || {}) as Record<string, unknown>;
        const rating = ratingsMap[u.id as string];
        return {
          id: u.id,
          name: u.display_name,
          email: u.email,
          role: u.role,
          isActive: u.is_active,
          emailVerified: u.email_verified,
          university: u.university,
          companyName: u.company_name,
          createdAt: u.created_at,
          lastLoginAt: u.last_login_at,
          approvalStatus: metadata.approvalStatus || (u.role === 'corporate_partner' ? 'approved' : null),
          avgRating: rating?.avg || null,
          ratingCount: rating?.count || null,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
