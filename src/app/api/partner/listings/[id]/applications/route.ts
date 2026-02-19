/**
 * GET /api/partner/listings/[id]/applications — List applications for a listing
 *
 * Returns all applications for a specific network listing owned by the partner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

async function getPartnerUser(email: string) {
  const rows = await sql`
    SELECT npu.id, npu.network_partner_id, npu.role
    FROM network_partner_users npu
    WHERE npu.email = ${email} AND npu.status = 'active'
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const listingId = params.id;

    // Verify listing belongs to partner
    const listing = await sql`
      SELECT id, title FROM network_listings
      WHERE id = ${listingId} AND network_partner_id = ${partnerUser.network_partner_id}
    `;
    if (listing.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || '';

    const applications = await sql`
      SELECT
        na.id, na.status, na.cover_letter, na.proposed_approach,
        na.availability_note, na.match_score, na.skills_match_score,
        na.reviewed_at, na.created_at,
        u.id AS student_id, u.first_name AS student_first_name,
        u.last_name AS student_last_name, u.email AS student_email,
        u.gpa AS student_gpa,
        t.id AS tenant_id, t.name AS tenant_name
      FROM network_applications na
      JOIN users u ON u.id = na.student_user_id
      LEFT JOIN tenants t ON t.id = na.tenant_id
      WHERE na.network_listing_id = ${listingId}
        ${status ? sql`AND na.status = ${status}` : sql``}
      ORDER BY na.created_at DESC
    `;

    return NextResponse.json({
      listingTitle: listing[0].title,
      applications: applications.map((a: Record<string, unknown>) => ({
        id: a.id,
        status: a.status,
        coverLetter: a.cover_letter,
        proposedApproach: a.proposed_approach,
        availabilityNote: a.availability_note,
        matchScore: a.match_score,
        skillsMatchScore: a.skills_match_score,
        reviewedAt: a.reviewed_at,
        createdAt: a.created_at,
        student: {
          id: a.student_id,
          firstName: a.student_first_name,
          lastName: a.student_last_name,
          email: a.student_email,
          gpa: a.student_gpa,
        },
        tenant: {
          id: a.tenant_id,
          name: a.tenant_name,
        },
      })),
    });
  } catch (error) {
    console.error('Partner listing applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
