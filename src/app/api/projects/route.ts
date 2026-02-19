/**
 * GET /api/projects — Browse/search published project listings
 *
 * Supports scope filter: ?scope=institution|network|all
 * Returns isInstitutionExclusive flag per listing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    const studentTenantId = session?.data?.tenantId || null;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const listingType = searchParams.get('type') || '';
    const remote = searchParams.get('remote');
    const skill = searchParams.get('skill') || '';
    const alumniOf = searchParams.get('alumniOf') || '';
    const sportsPlayed = searchParams.get('sportsPlayed') || '';
    const scope = searchParams.get('scope') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [sql`l.status = 'published'`];

    if (search) {
      conditions.push(sql`(l.title ILIKE ${'%' + search + '%'} OR l.description ILIKE ${'%' + search + '%'})`);
    }

    if (category) {
      conditions.push(sql`l.category = ${category}`);
    }

    if (listingType && (listingType === 'project' || listingType === 'internship')) {
      conditions.push(sql`l.listing_type = ${listingType}`);
    }

    if (remote === 'true') {
      conditions.push(sql`l.remote_allowed = true`);
    }

    if (skill) {
      conditions.push(sql`l.skills_required @> ${JSON.stringify([skill])}::jsonb`);
    }

    if (alumniOf) {
      const alumniPattern = `%${alumniOf}%`;
      conditions.push(sql`u.metadata->>'alumniOf' ILIKE ${alumniPattern}`);
    }

    if (sportsPlayed) {
      const sportsPattern = `%${sportsPlayed}%`;
      conditions.push(sql`u.metadata->>'sportsPlayed' ILIKE ${sportsPattern}`);
    }

    // Scope filter: institution-exclusive vs network-wide
    if (scope === 'institution' && studentTenantId) {
      conditions.push(sql`l.tenant_id = ${studentTenantId}`);
    } else if (scope === 'network') {
      // Show listings from other tenants that are marked as network-visible,
      // plus listings with no tenant (platform-wide)
      if (studentTenantId) {
        conditions.push(sql`(
          (l.tenant_id != ${studentTenantId} AND l.visibility = 'network')
          OR l.tenant_id IS NULL
        )`);
      } else {
        conditions.push(sql`(l.visibility = 'network' OR l.tenant_id IS NULL)`);
      }
    } else if (!scope && studentTenantId) {
      // Default "all": show own tenant's listings + network-visible from other tenants
      conditions.push(sql`(
        l.tenant_id = ${studentTenantId}
        OR (l.tenant_id != ${studentTenantId} AND l.visibility = 'network')
        OR l.tenant_id IS NULL
      )`);
    }

    const whereClause = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`
    );

    // Get listings with author info and tenant scope
    const listings = await sql`
      SELECT
        l.id, l.title, l.description, l.category, l.listing_type, l.location,
        l.remote_allowed, l.compensation, l.hours_per_week,
        l.duration, l.start_date, l.end_date, l.max_applicants,
        l.requires_nda, l.skills_required, l.published_at, l.created_at,
        l.visibility, l.tenant_id as listing_tenant_id,
        t.name as tenant_name,
        u.id as author_id, u.first_name as author_first_name,
        u.last_name as author_last_name, u.display_name as author_display_name,
        u.company_name as author_company_name,
        u.metadata as author_metadata,
        u.public_data as author_public_data,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id) as application_count
      FROM listings l
      JOIN users u ON u.id = l.author_id
      LEFT JOIN tenants t ON t.id = l.tenant_id
      WHERE ${whereClause}
      ORDER BY l.published_at DESC NULLS LAST, l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON u.id = l.author_id
      WHERE ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

    // Get available categories for filter
    const categories = await sql`
      SELECT DISTINCT category FROM listings
      WHERE status = 'published' AND category IS NOT NULL
      ORDER BY category
    `;

    // Get ratings for listing authors
    const authorIds = Array.from(new Set(listings.map((l: Record<string, unknown>) => l.author_id as string)));
    let authorRatings: Record<string, { avg: number; count: number }> = {};
    if (authorIds.length > 0) {
      const ratings = await sql`
        SELECT corporate_id, AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rating_count
        FROM corporate_ratings
        WHERE corporate_id = ANY(${authorIds})
        GROUP BY corporate_id
      `;
      authorRatings = Object.fromEntries(
        ratings.map((r: Record<string, unknown>) => [
          r.corporate_id as string,
          { avg: Number(r.avg_rating), count: Number(r.rating_count) },
        ])
      );
    }

    return NextResponse.json({
      listings: listings.map((l: Record<string, unknown>) => {
        const authorMeta = (l.author_metadata || {}) as Record<string, unknown>;
        const authorPublicData = (l.author_public_data || {}) as Record<string, unknown>;
        const rating = authorRatings[l.author_id as string];
        const listingTenantId = l.listing_tenant_id as string | null;
        const isInstitutionExclusive = !!(listingTenantId && studentTenantId && listingTenantId === studentTenantId);
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          category: l.category,
          listingType: l.listing_type || 'project',
          location: l.location,
          remoteAllowed: l.remote_allowed,
          compensation: l.compensation,
          hoursPerWeek: l.hours_per_week,
          duration: l.duration,
          startDate: l.start_date,
          endDate: l.end_date,
          maxApplicants: l.max_applicants,
          requiresNda: l.requires_nda,
          skillsRequired: l.skills_required,
          publishedAt: l.published_at,
          createdAt: l.created_at,
          applicationCount: parseInt(l.application_count as string),
          visibility: l.visibility || 'tenant',
          isInstitutionExclusive,
          tenantName: (l.tenant_name as string) || null,
          author: {
            id: l.author_id,
            firstName: l.author_first_name,
            lastName: l.author_last_name,
            displayName: l.author_display_name,
            companyName: (l.author_company_name as string) || null,
            companyWebsite: (authorPublicData.companyWebsite as string) || null,
            stockSymbol: (authorPublicData.stockSymbol as string) || null,
            isPubliclyTraded: (authorPublicData.isPubliclyTraded as boolean) ?? false,
            alumniOf: (authorMeta.alumniOf as string) || null,
            sportsPlayed: (authorMeta.sportsPlayed as string) || null,
            avgRating: rating?.avg || null,
            ratingCount: rating?.count || null,
          },
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categories: categories.map((c: Record<string, unknown>) => c.category as string),
    });
  } catch (error) {
    console.error('Projects list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
