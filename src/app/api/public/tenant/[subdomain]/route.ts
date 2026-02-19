/**
 * GET /api/public/tenant/[subdomain] — Public tenant info (no auth required)
 *
 * Returns tenant display info, stats, and featured partners.
 * Used by the landing page for client-side updates and external integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;

    // Fetch tenant data (only public-safe fields)
    const rows = await sql`
      SELECT id, name, display_name, subdomain, marketplace_type, sport, team_name, conference,
             hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
             gallery_images, social_links, about_content, contact_info,
             branding
      FROM tenants
      WHERE subdomain = ${subdomain} AND status = 'active'
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = rows[0];

    // Fetch aggregate stats
    const statsRows = await sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE tenant_id = ${tenant.id} AND role = 'student') AS student_count,
        (SELECT COUNT(*) FROM listings WHERE tenant_id = ${tenant.id}) AS listing_count,
        (SELECT COUNT(*) FROM tenant_partner_access WHERE tenant_id = ${tenant.id} AND is_active = true) AS partner_count
    `;

    // Fetch featured alumni partners
    const partners = await sql`
      SELECT np.name, np.slug, np.logo_url, np.description, np.industry,
             np.alumni_graduation_year, np.alumni_position, np.alumni_years_on_team,
             npu.first_name, npu.last_name, npu.avatar_url, npu.alumni_bio
      FROM tenant_partner_access tpa
      JOIN network_partners np ON np.id = tpa.network_partner_id
      LEFT JOIN network_partner_users npu ON npu.network_partner_id = np.id AND npu.role = 'owner'
      WHERE tpa.tenant_id = ${tenant.id}
        AND tpa.is_active = true
        AND tpa.featured_in_tenant = true
        AND np.status = 'active'
      ORDER BY np.featured DESC, np.created_at ASC
      LIMIT 6
    `;

    const stats = statsRows[0];

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        displayName: tenant.display_name,
        subdomain: tenant.subdomain,
        marketplaceType: tenant.marketplace_type,
        sport: tenant.sport,
        teamName: tenant.team_name,
        conference: tenant.conference,
        heroVideoUrl: tenant.hero_video_url,
        heroVideoPosterUrl: tenant.hero_video_poster_url,
        heroHeadline: tenant.hero_headline,
        heroSubheadline: tenant.hero_subheadline,
        galleryImages: tenant.gallery_images,
        socialLinks: tenant.social_links,
        aboutContent: tenant.about_content,
        contactInfo: tenant.contact_info,
        branding: tenant.branding,
      },
      stats: {
        students: Number(stats.student_count) || 0,
        listings: Number(stats.listing_count) || 0,
        partners: Number(stats.partner_count) || 0,
      },
      partners: partners.map((p: Record<string, unknown>) => ({
        name: p.name,
        slug: p.slug,
        logoUrl: p.logo_url,
        description: p.description,
        industry: p.industry,
        alumniGraduationYear: p.alumni_graduation_year,
        alumniPosition: p.alumni_position,
        alumniYearsOnTeam: p.alumni_years_on_team,
        ownerFirstName: p.first_name,
        ownerLastName: p.last_name,
        ownerAvatarUrl: p.avatar_url,
        ownerAlumniBio: p.alumni_bio,
      })),
    });
  } catch (error) {
    console.error('Public tenant API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
