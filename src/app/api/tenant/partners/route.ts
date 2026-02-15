/**
 * GET /api/tenant/partners — List network partners visible to the current tenant
 *
 * Accessible by edu_admin / educational_admin roles only.
 * Returns partners linked via tenant_partner_access plus any with
 * visibility='network' that the tenant could discover.
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

    if (
      session.data.role !== 'educational_admin' &&
      session.data.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with account' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const relationship = searchParams.get('relationship') || '';

    // Return partners that either:
    //   1. Have an active tenant_partner_access row for this tenant, OR
    //   2. Are active with visibility = 'network' (discoverable)
    const partners = await sql`
      SELECT
        np.id, np.name, np.slug, np.type, np.industry, np.website,
        np.logo_url, np.description, np.company_size, np.headquarters,
        np.is_alumni_partner, np.alumni_institution, np.alumni_sport,
        np.alumni_graduation_year, np.alumni_position,
        np.status, np.visibility, np.verified, np.featured,
        np.primary_contact_name, np.primary_contact_email,
        np.created_at,
        tpa.id AS access_id,
        tpa.relationship,
        tpa.custom_display_name,
        tpa.custom_description,
        tpa.featured_in_tenant,
        tpa.is_active AS access_active,
        tpa.accepted_at,
        COUNT(DISTINCT nl.id) FILTER (WHERE nl.status IN ('open', 'in_progress')) AS active_listing_count
      FROM network_partners np
      LEFT JOIN tenant_partner_access tpa
        ON tpa.network_partner_id = np.id AND tpa.tenant_id = ${tenantId}
      LEFT JOIN network_listings nl
        ON nl.network_partner_id = np.id
      WHERE np.status = 'active'
        AND (
          (tpa.id IS NOT NULL AND tpa.is_active = true)
          OR np.visibility = 'network'
        )
        ${search ? sql`AND (np.name ILIKE ${'%' + search + '%'} OR np.industry ILIKE ${'%' + search + '%'})` : sql``}
        ${relationship ? sql`AND tpa.relationship = ${relationship}` : sql``}
      GROUP BY np.id, tpa.id
      ORDER BY
        tpa.featured_in_tenant DESC NULLS LAST,
        np.featured DESC,
        np.name ASC
    `;

    return NextResponse.json({
      partners: partners.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.custom_display_name || p.name,
        slug: p.slug,
        type: p.type,
        industry: p.industry,
        website: p.website,
        logoUrl: p.logo_url,
        description: p.custom_description || p.description,
        companySize: p.company_size,
        headquarters: p.headquarters,
        isAlumniPartner: p.is_alumni_partner,
        alumniInstitution: p.alumni_institution,
        alumniSport: p.alumni_sport,
        alumniGraduationYear: p.alumni_graduation_year,
        alumniPosition: p.alumni_position,
        status: p.status,
        visibility: p.visibility,
        verified: p.verified,
        featured: p.featured,
        primaryContactName: p.primary_contact_name,
        primaryContactEmail: p.primary_contact_email,
        createdAt: p.created_at,
        // Tenant-specific access info
        access: p.access_id
          ? {
              id: p.access_id,
              relationship: p.relationship,
              featuredInTenant: p.featured_in_tenant,
              isActive: p.access_active,
              acceptedAt: p.accepted_at,
            }
          : null,
        stats: {
          activeListings: Number(p.active_listing_count) || 0,
        },
      })),
    });
  } catch (error) {
    console.error('List tenant partners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
