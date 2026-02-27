/**
 * GET  /api/admin/network-partners — List all network partners (system admin only)
 * POST /api/admin/network-partners — Create a new network partner (system admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const createPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'Slug must be lowercase alphanumeric with optional hyphens'
    ),
  type: z.enum(['corporate', 'alumni', 'nonprofit', 'government']),
  industry: z.string().max(255).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  companySize: z.string().max(50).optional(),
  headquarters: z.string().max(255).optional(),
  isAlumniPartner: z.boolean().optional().default(false),
  alumniInstitution: z.string().max(255).optional(),
  alumniSport: z.string().max(100).optional(),
  alumniGraduationYear: z.number().int().optional(),
  alumniPosition: z.string().max(100).optional(),
  alumniYearsOnTeam: z.number().int().optional(),
  status: z
    .enum(['pending', 'active', 'suspended', 'inactive'])
    .optional()
    .default('pending'),
  visibility: z.enum(['network', 'private', 'hybrid']).optional().default('network'),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const alumni = searchParams.get('alumni') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Use tagged template with optional filtering
    const partners = await sql`
      SELECT
        np.*,
        COUNT(DISTINCT tpa.tenant_id) FILTER (WHERE tpa.is_active = true) AS tenant_count,
        COUNT(DISTINCT nl.id) AS listing_count
      FROM network_partners np
      LEFT JOIN tenant_partner_access tpa ON tpa.network_partner_id = np.id
      LEFT JOIN network_listings nl ON nl.network_partner_id = np.id
      WHERE 1=1
        ${search ? sql`AND (np.name ILIKE ${'%' + search + '%'} OR np.slug ILIKE ${'%' + search + '%'} OR np.primary_contact_email ILIKE ${'%' + search + '%'})` : sql``}
        ${status ? sql`AND np.status = ${status}` : sql``}
        ${type ? sql`AND np.type = ${type}` : sql``}
        ${alumni === 'true' ? sql`AND np.is_alumni_partner = true` : sql``}
      GROUP BY np.id
      ORDER BY np.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count: totalCount }] = await sql`
      SELECT COUNT(*) AS count
      FROM network_partners np
      WHERE 1=1
        ${search ? sql`AND (np.name ILIKE ${'%' + search + '%'} OR np.slug ILIKE ${'%' + search + '%'} OR np.primary_contact_email ILIKE ${'%' + search + '%'})` : sql``}
        ${status ? sql`AND np.status = ${status}` : sql``}
        ${type ? sql`AND np.type = ${type}` : sql``}
        ${alumni === 'true' ? sql`AND np.is_alumni_partner = true` : sql``}
    `;

    return NextResponse.json({
      partners: partners.map((p: Record<string, unknown>) => ({
        id: p.id,
        linkedUserId: p.linked_user_id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        industry: p.industry,
        website: p.website,
        logoUrl: p.logo_url,
        description: p.description,
        companySize: p.company_size,
        headquarters: p.headquarters,
        isAlumniPartner: p.is_alumni_partner,
        alumniInstitution: p.alumni_institution,
        alumniSport: p.alumni_sport,
        alumniGraduationYear: p.alumni_graduation_year,
        alumniPosition: p.alumni_position,
        alumniYearsOnTeam: p.alumni_years_on_team,
        status: p.status,
        visibility: p.visibility,
        verified: p.verified,
        featured: p.featured,
        primaryContactName: p.primary_contact_name,
        primaryContactEmail: p.primary_contact_email,
        primaryContactPhone: p.primary_contact_phone,
        stripeCustomerId: p.stripe_customer_id,
        subscriptionStatus: p.subscription_status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        stats: {
          tenants: Number(p.tenant_count) || 0,
          listings: Number(p.listing_count) || 0,
        },
      })),
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    });
  } catch (error) {
    console.error('List network partners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existing = await sql`
      SELECT id FROM network_partners WHERE slug = ${data.slug}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }

    const [partner] = await sql`
      INSERT INTO network_partners (
        name, slug, type, industry, website, logo_url, description,
        company_size, headquarters, is_alumni_partner,
        alumni_institution, alumni_sport, alumni_graduation_year,
        alumni_position, alumni_years_on_team,
        status, visibility,
        primary_contact_name, primary_contact_email, primary_contact_phone
      ) VALUES (
        ${data.name},
        ${data.slug},
        ${data.type},
        ${data.industry || null},
        ${data.website || null},
        ${data.logoUrl || null},
        ${data.description || null},
        ${data.companySize || null},
        ${data.headquarters || null},
        ${data.isAlumniPartner},
        ${data.alumniInstitution || null},
        ${data.alumniSport || null},
        ${data.alumniGraduationYear || null},
        ${data.alumniPosition || null},
        ${data.alumniYearsOnTeam || null},
        ${data.status},
        ${data.visibility},
        ${data.primaryContactName || null},
        ${data.primaryContactEmail || null},
        ${data.primaryContactPhone || null}
      )
      RETURNING *
    `;

    return NextResponse.json(
      {
        partner: {
          id: partner.id,
          name: partner.name,
          slug: partner.slug,
          type: partner.type,
          industry: partner.industry,
          website: partner.website,
          logoUrl: partner.logo_url,
          description: partner.description,
          companySize: partner.company_size,
          headquarters: partner.headquarters,
          isAlumniPartner: partner.is_alumni_partner,
          alumniInstitution: partner.alumni_institution,
          alumniSport: partner.alumni_sport,
          alumniGraduationYear: partner.alumni_graduation_year,
          alumniPosition: partner.alumni_position,
          alumniYearsOnTeam: partner.alumni_years_on_team,
          status: partner.status,
          visibility: partner.visibility,
          verified: partner.verified,
          featured: partner.featured,
          primaryContactName: partner.primary_contact_name,
          primaryContactEmail: partner.primary_contact_email,
          primaryContactPhone: partner.primary_contact_phone,
          createdAt: partner.created_at,
          updatedAt: partner.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create network partner error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
