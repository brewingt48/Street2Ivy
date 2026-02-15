/**
 * GET /api/projects/feed — Unified student feed
 *
 * Returns the combined feed of private tenant listings + network listings
 * using the get_visible_listings() SQL function.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || ''; // 'private', 'network', or '' for all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
    const offset = (page - 1) * limit;

    const searchPattern = '%' + q + '%';

    // Use get_visible_listings() SQL function for combined results
    const listings = await sql`
      SELECT * FROM get_visible_listings(${tenantId})
      WHERE (${searchPattern} = '%%' OR title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        AND (${category} = '' OR category = ${category})
        AND (${source} = '' OR source = ${source})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count total
    const countResult = await sql`
      SELECT COUNT(*) AS total FROM get_visible_listings(${tenantId})
      WHERE (${searchPattern} = '%%' OR title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        AND (${category} = '' OR category = ${category})
        AND (${source} = '' OR source = ${source})
    `;

    const total = Number(countResult[0].total);

    // Get available categories for filter
    const categories = await sql`
      SELECT DISTINCT category FROM get_visible_listings(${tenantId})
      WHERE category IS NOT NULL
      ORDER BY category
    `;

    return NextResponse.json({
      listings: listings.map((l: Record<string, unknown>) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        category: l.category,
        source: l.source,
        partnerName: l.partner_name,
        location: l.location,
        remoteOk: l.remote_ok,
        isPaid: l.is_paid,
        budgetMin: l.budget_min,
        budgetMax: l.budget_max,
        paymentType: l.payment_type,
        estimatedHours: l.estimated_hours,
        startDate: l.start_date,
        endDate: l.end_date,
        applicationDeadline: l.application_deadline,
        maxStudents: l.max_students,
        status: l.status,
        isAlumniProject: l.is_alumni_project,
        alumniMessage: l.alumni_message,
        isFeatured: l.is_featured,
        createdAt: l.created_at,
        publishedAt: l.published_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categories: categories.map((c: Record<string, unknown>) => c.category as string),
    });
  } catch (error) {
    console.error('Projects feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
