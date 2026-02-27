import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LandingPageClient } from './landing-page-client';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function SubdomainLandingPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // Fetch tenant data
  const rows = await sql`
    SELECT id, name, display_name, subdomain, marketplace_type, sport, team_name, conference,
           hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
           hero_carousel, gallery_images, social_links, about_content, contact_info,
           branding, features
    FROM tenants
    WHERE subdomain = ${subdomain} AND status = 'active'
  `;

  if (rows.length === 0) return notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = rows[0] as any;

  // Fetch stats
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

  // Fetch published legal policies (platform + tenant)
  const legalPolicies = await sql`
    SELECT title, slug, 'platform' AS scope, sort_order
    FROM legal_policies
    WHERE tenant_id IS NULL AND is_published = true
    UNION ALL
    SELECT title, slug, 'tenant' AS scope, sort_order
    FROM legal_policies
    WHERE tenant_id = ${tenant.id} AND is_published = true
    ORDER BY scope, sort_order, title
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LandingPageClient tenant={tenant} stats={statsRows[0] as any} partners={partners as any} legalPolicies={legalPolicies as any} />;
}
