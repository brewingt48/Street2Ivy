/**
 * GET    /api/admin/network-partners/[id] — Get partner detail
 * PUT    /api/admin/network-partners/[id] — Update partner
 * DELETE /api/admin/network-partners/[id] — Soft delete (set status = 'inactive')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const updatePartnerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'Slug must be lowercase alphanumeric with optional hyphens'
    )
    .optional(),
  type: z.enum(['corporate', 'alumni', 'nonprofit', 'government']).optional(),
  industry: z.string().max(255).nullable().optional(),
  website: z.string().url().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  companySize: z.string().max(50).nullable().optional(),
  headquarters: z.string().max(255).nullable().optional(),
  isAlumniPartner: z.boolean().optional(),
  alumniInstitution: z.string().max(255).nullable().optional(),
  alumniSport: z.string().max(100).nullable().optional(),
  alumniGraduationYear: z.number().int().nullable().optional(),
  alumniPosition: z.string().max(100).nullable().optional(),
  alumniYearsOnTeam: z.number().int().nullable().optional(),
  status: z.enum(['pending', 'active', 'suspended', 'inactive']).optional(),
  visibility: z.enum(['network', 'private', 'hybrid']).optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  primaryContactName: z.string().max(255).nullable().optional(),
  primaryContactEmail: z.string().email().nullable().optional(),
  primaryContactPhone: z.string().max(50).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [partner] = await sql`
      SELECT
        np.*,
        COUNT(DISTINCT tpa.tenant_id) FILTER (WHERE tpa.is_active = true) AS tenant_count,
        COUNT(DISTINCT nl.id) AS listing_count,
        COUNT(DISTINCT npu.id) AS user_count,
        COUNT(DISTINCT na.id) AS application_count
      FROM network_partners np
      LEFT JOIN tenant_partner_access tpa ON tpa.network_partner_id = np.id
      LEFT JOIN network_listings nl ON nl.network_partner_id = np.id
      LEFT JOIN network_partner_users npu ON npu.network_partner_id = np.id
      LEFT JOIN network_applications na ON na.network_listing_id = nl.id
      WHERE np.id = ${id}
      GROUP BY np.id
    `;

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Get partner users
    const users = await sql`
      SELECT id, email, first_name, last_name, title, role, status,
             is_alumni, last_login_at, created_at
      FROM network_partner_users
      WHERE network_partner_id = ${id}
      ORDER BY created_at ASC
    `;

    // Get recent listings
    const listings = await sql`
      SELECT id, title, status, category, is_paid, max_students,
             students_accepted, published_at, created_at
      FROM network_listings
      WHERE network_partner_id = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      partner: {
        id: partner.id,
        linkedUserId: partner.linked_user_id,
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
        stripeCustomerId: partner.stripe_customer_id,
        subscriptionStatus: partner.subscription_status,
        createdAt: partner.created_at,
        updatedAt: partner.updated_at,
        stats: {
          tenants: Number(partner.tenant_count) || 0,
          listings: Number(partner.listing_count) || 0,
          users: Number(partner.user_count) || 0,
          applications: Number(partner.application_count) || 0,
        },
      },
      users: users.map((u: Record<string, unknown>) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        title: u.title,
        role: u.role,
        status: u.status,
        isAlumni: u.is_alumni,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      recentListings: listings.map((l: Record<string, unknown>) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        category: l.category,
        isPaid: l.is_paid,
        maxStudents: l.max_students,
        studentsAccepted: l.students_accepted,
        publishedAt: l.published_at,
        createdAt: l.created_at,
      })),
    });
  } catch (error) {
    console.error('Get network partner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check partner exists
    const [current] = await sql`SELECT * FROM network_partners WHERE id = ${id}`;
    if (!current) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // If slug is being changed, check uniqueness
    if (data.slug && data.slug !== current.slug) {
      const slugCheck = await sql`
        SELECT id FROM network_partners WHERE slug = ${data.slug} AND id != ${id}
      `;
      if (slugCheck.length > 0) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
      }
    }

    const [updated] = await sql`
      UPDATE network_partners SET
        name = ${data.name ?? current.name},
        slug = ${data.slug ?? current.slug},
        type = ${data.type ?? current.type},
        industry = ${data.industry !== undefined ? data.industry : current.industry},
        website = ${data.website !== undefined ? data.website : current.website},
        logo_url = ${data.logoUrl !== undefined ? data.logoUrl : current.logo_url},
        description = ${data.description !== undefined ? data.description : current.description},
        company_size = ${data.companySize !== undefined ? data.companySize : current.company_size},
        headquarters = ${data.headquarters !== undefined ? data.headquarters : current.headquarters},
        is_alumni_partner = ${data.isAlumniPartner ?? current.is_alumni_partner},
        alumni_institution = ${data.alumniInstitution !== undefined ? data.alumniInstitution : current.alumni_institution},
        alumni_sport = ${data.alumniSport !== undefined ? data.alumniSport : current.alumni_sport},
        alumni_graduation_year = ${data.alumniGraduationYear !== undefined ? data.alumniGraduationYear : current.alumni_graduation_year},
        alumni_position = ${data.alumniPosition !== undefined ? data.alumniPosition : current.alumni_position},
        alumni_years_on_team = ${data.alumniYearsOnTeam !== undefined ? data.alumniYearsOnTeam : current.alumni_years_on_team},
        status = ${data.status ?? current.status},
        visibility = ${data.visibility ?? current.visibility},
        verified = ${data.verified ?? current.verified},
        featured = ${data.featured ?? current.featured},
        primary_contact_name = ${data.primaryContactName !== undefined ? data.primaryContactName : current.primary_contact_name},
        primary_contact_email = ${data.primaryContactEmail !== undefined ? data.primaryContactEmail : current.primary_contact_email},
        primary_contact_phone = ${data.primaryContactPhone !== undefined ? data.primaryContactPhone : current.primary_contact_phone},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({
      partner: {
        id: updated.id,
        linkedUserId: updated.linked_user_id,
        name: updated.name,
        slug: updated.slug,
        type: updated.type,
        industry: updated.industry,
        website: updated.website,
        logoUrl: updated.logo_url,
        description: updated.description,
        companySize: updated.company_size,
        headquarters: updated.headquarters,
        isAlumniPartner: updated.is_alumni_partner,
        alumniInstitution: updated.alumni_institution,
        alumniSport: updated.alumni_sport,
        alumniGraduationYear: updated.alumni_graduation_year,
        alumniPosition: updated.alumni_position,
        alumniYearsOnTeam: updated.alumni_years_on_team,
        status: updated.status,
        visibility: updated.visibility,
        verified: updated.verified,
        featured: updated.featured,
        primaryContactName: updated.primary_contact_name,
        primaryContactEmail: updated.primary_contact_email,
        primaryContactPhone: updated.primary_contact_phone,
        stripeCustomerId: updated.stripe_customer_id,
        subscriptionStatus: updated.subscription_status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Update network partner error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [updated] = await sql`
      UPDATE network_partners
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status, updated_at
    `;

    if (!updated) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({
      partner: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Delete network partner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
