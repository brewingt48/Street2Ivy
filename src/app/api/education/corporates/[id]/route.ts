/**
 * GET /api/education/corporates/[id] — Corporate partner detail for edu admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.data.tenantId;

    // Get corporate partner user with aggregate stats
    const users = await sql`
      SELECT u.id, u.display_name, u.email, u.company_name, u.is_active,
             u.metadata, u.public_data, u.created_at, u.avatar_url,
             COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'published') as active_listings,
             COUNT(DISTINCT l.id) as total_listings,
             COUNT(DISTINCT pa.id) as total_applications
      FROM users u
      LEFT JOIN listings l ON l.author_id = u.id
      LEFT JOIN project_applications pa ON pa.listing_id = l.id
      WHERE u.id = ${id}
        AND u.role = 'corporate_partner'
        AND u.tenant_id = ${tenantId}
      GROUP BY u.id
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const user = users[0];

    // Get ratings from corporate_ratings table (same as list endpoint)
    const ratings = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rating_count
      FROM corporate_ratings
      WHERE corporate_id = ${id}
    `;
    const avgRating = ratings[0]?.avg_rating ? Number(ratings[0].avg_rating) : 0;
    const ratingCount = ratings[0]?.rating_count ? Number(ratings[0].rating_count) : 0;

    // Get their listings
    const listings = await sql`
      SELECT l.id, l.title, l.status, l.category, l.created_at, l.published_at,
             COUNT(DISTINCT pa.id) as application_count
      FROM listings l
      LEFT JOIN project_applications pa ON pa.listing_id = l.id
      WHERE l.author_id = ${id}
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `;

    const metadata = (user.metadata || {}) as Record<string, unknown>;
    const publicData = (user.public_data || {}) as Record<string, unknown>;

    return NextResponse.json({
      corporate: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        companyName: user.company_name,
        companyWebsite: (publicData.companyWebsite as string) || (metadata.companyWebsite as string) || null,
        companyIndustry: (publicData.companyIndustry as string) || (metadata.companyIndustry as string) || null,
        stockSymbol: (publicData.stockSymbol as string) || (metadata.stockSymbol as string) || null,
        isPubliclyTraded: (publicData.isPubliclyTraded as boolean) || (metadata.isPubliclyTraded as boolean) || false,
        isActive: user.is_active,
        approvalStatus: (metadata.approvalStatus as string) || 'approved',
        createdAt: user.created_at,
        activeListings: parseInt(user.active_listings as string),
        totalListings: parseInt(user.total_listings as string),
        totalApplications: parseInt(user.total_applications as string),
        avgRating,
        ratingCount,
      },
      listings: listings.map((l: Record<string, unknown>) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        category: l.category,
        createdAt: l.created_at,
        publishedAt: l.published_at,
        applicationCount: parseInt(l.application_count as string),
      })),
    });
  } catch (error) {
    console.error('Error fetching corporate detail:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
