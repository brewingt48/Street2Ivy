/**
 * GET /api/corporate/search-students — Search students for invitations
 *
 * Supports scope: tenant (own institution) or network (all students).
 * Network scope supports institution name filter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const graduationYear = searchParams.get('graduationYear') || '';
    const scope = searchParams.get('scope') || 'tenant';
    const institution = searchParams.get('institution') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const tenantId = session.data.tenantId;

    // Build dynamic WHERE conditions
    const conditions = [
      sql`u.role = 'student'`,
      sql`u.is_active = true`,
    ];

    // Scope filter
    if (scope === 'tenant' && tenantId) {
      conditions.push(sql`u.tenant_id = ${tenantId}`);
    }
    // Network scope: no tenant filter (searches all students)
    // But allow filtering by institution name
    if (scope === 'network' && institution) {
      const instPattern = `%${institution}%`;
      conditions.push(sql`u.university ILIKE ${instPattern}`);
    }

    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(
        sql`(u.display_name ILIKE ${searchPattern} OR u.major ILIKE ${searchPattern})`
      );
    }

    if (graduationYear) {
      const year = parseInt(graduationYear);
      if (!isNaN(year)) {
        conditions.push(sql`u.graduation_year = ${year}`);
      }
    }

    const whereClause = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`
    );

    const students = await sql`
      SELECT u.id, u.display_name, u.email, u.university, u.major,
             u.graduation_year, u.gpa, u.bio, u.metadata, u.tenant_id,
             t.name as tenant_name,
             COALESCE(
               (SELECT array_agg(s.name) FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = u.id),
               ARRAY[]::text[]
             ) as skills
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as count FROM users u
      WHERE ${whereClause}
    `;
    const total = parseInt(countResult[0].count as string);

    // When searching network, also return distinct universities for autocomplete
    let universities: string[] = [];
    if (scope === 'network') {
      const uniResult = await sql`
        SELECT DISTINCT u.university
        FROM users u
        WHERE u.role = 'student' AND u.is_active = true
          AND u.university IS NOT NULL AND u.university != ''
          ${tenantId ? sql`AND u.tenant_id != ${tenantId}` : sql``}
        ORDER BY u.university
        LIMIT 100
      `;
      universities = uniResult.map((r: Record<string, unknown>) => r.university as string);
    }

    // Check which universities belong to active tenants in the network
    const networkTenantUnis = new Set<string>();
    if (scope === 'network') {
      const tenantResult = await sql`
        SELECT DISTINCT t.name
        FROM tenants t
        WHERE t.status = 'active'
          AND (t.features->>'sharedNetworkEnabled')::boolean = true
          ${tenantId ? sql`AND t.id != ${tenantId}` : sql``}
      `;
      tenantResult.forEach((r: Record<string, unknown>) => {
        if (r.name) networkTenantUnis.add(r.name as string);
      });
    }

    return NextResponse.json({
      students: students.map((s: Record<string, unknown>) => {
        const metadata = (s.metadata || {}) as Record<string, unknown>;
        const studentTenantName = s.tenant_name as string | null;
        return {
          id: s.id,
          name: s.display_name,
          email: s.email,
          university: s.university,
          major: s.major,
          graduationYear: s.graduation_year,
          gpa: s.gpa,
          bio: s.bio,
          hoursPerWeek: null,
          location: null,
          openToWork: false,
          skills: s.skills || [],
          alumniOf: (metadata.alumniOf as string) || null,
          sportsPlayed: (metadata.sportsPlayed as string) || null,
          activities: (metadata.activities as string) || null,
          tenantName: studentTenantName,
          isInNetwork: studentTenantName ? networkTenantUnis.has(studentTenantName) : false,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      universities,
    });
  } catch (error) {
    console.error('Search students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
