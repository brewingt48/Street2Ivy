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
               company_name, created_at, last_login_at
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
               company_name, created_at, last_login_at
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
               company_name, created_at, last_login_at
        FROM users WHERE role = ${role}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM users WHERE role = ${role}`;
      total = parseInt(countResult[0].count as string);
    } else {
      users = await sql`
        SELECT id, display_name, email, role, is_active, email_verified, university,
               company_name, created_at, last_login_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
      total = parseInt(countResult[0].count as string);
    }

    return NextResponse.json({
      users: users.map((u: Record<string, unknown>) => ({
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
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
