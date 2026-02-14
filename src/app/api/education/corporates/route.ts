/**
 * GET /api/education/corporates — List corporate partners for tenant's edu admin
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
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    const tenantId = session.data.tenantId;

    // Build query conditions
    let users;
    let total;

    if (q) {
      const pattern = `%${q}%`;
      users = await sql`
        SELECT u.id, u.display_name, u.email, u.company_name, u.is_active,
               u.metadata, u.created_at,
               COUNT(DISTINCT l.id) as listing_count
        FROM users u
        LEFT JOIN listings l ON l.author_id = u.id
        WHERE u.role = 'corporate_partner'
          AND u.tenant_id = ${tenantId}
          AND (u.display_name ILIKE ${pattern} OR u.email ILIKE ${pattern} OR u.company_name ILIKE ${pattern})
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users
        WHERE role = 'corporate_partner' AND tenant_id = ${tenantId}
          AND (display_name ILIKE ${pattern} OR email ILIKE ${pattern} OR company_name ILIKE ${pattern})
      `;
      total = parseInt(countResult[0].count as string);
    } else {
      users = await sql`
        SELECT u.id, u.display_name, u.email, u.company_name, u.is_active,
               u.metadata, u.created_at,
               COUNT(DISTINCT l.id) as listing_count
        FROM users u
        LEFT JOIN listings l ON l.author_id = u.id
        WHERE u.role = 'corporate_partner'
          AND u.tenant_id = ${tenantId}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users
        WHERE role = 'corporate_partner' AND tenant_id = ${tenantId}
      `;
      total = parseInt(countResult[0].count as string);
    }

    // Get ratings for these corporate partners
    const corporateIds = users.map((u: Record<string, unknown>) => u.id as string);
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
      corporates: users.map((u: Record<string, unknown>) => {
        const metadata = (u.metadata || {}) as Record<string, unknown>;
        const rating = ratingsMap[u.id as string];
        return {
          id: u.id,
          name: u.display_name,
          email: u.email,
          companyName: u.company_name,
          isActive: u.is_active,
          approvalStatus: (metadata.approvalStatus as string) || 'approved',
          avgRating: rating?.avg || null,
          ratingCount: rating?.count || null,
          listingCount: parseInt(u.listing_count as string) || 0,
          createdAt: u.created_at,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Education corporates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
