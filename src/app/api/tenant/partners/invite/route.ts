/**
 * POST /api/tenant/partners/invite — Invite an alumni or corporate partner
 *
 * Creates a new network_partner (or links an existing one) and creates a
 * tenant_partner_access row with relationship = 'exclusive'.
 * Accessible by edu_admin / educational_admin roles only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const invitePartnerSchema = z.object({
  // If linking an existing partner, provide the id:
  existingPartnerId: z.string().uuid().optional(),

  // Otherwise, create a new partner with these fields:
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
  industry: z.string().max(255).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  isAlumniPartner: z.boolean().optional().default(false),
  alumniInstitution: z.string().max(255).optional(),
  alumniSport: z.string().max(100).optional(),
  alumniGraduationYear: z.number().int().optional(),
  alumniPosition: z.string().max(100).optional(),
  alumniYearsOnTeam: z.number().int().optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),

  // Access customization
  customDisplayName: z.string().max(255).optional(),
  customDescription: z.string().optional(),
  featuredInTenant: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = invitePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sql.begin(async (tx: any) => {
      let partnerId: string;

      if (data.existingPartnerId) {
        // Link an existing partner
        const [existing] = await tx`
          SELECT id, status FROM network_partners WHERE id = ${data.existingPartnerId}
        `;
        if (!existing) {
          throw new Error('Partner not found');
        }
        if (existing.status === 'inactive') {
          throw new Error('Cannot invite an inactive partner');
        }
        partnerId = existing.id;
      } else {
        // Validate required fields for new partner creation
        if (!data.name || !data.slug || !data.type) {
          throw new Error(
            'name, slug, and type are required when creating a new partner'
          );
        }

        // Check slug uniqueness
        const slugCheck = await tx`
          SELECT id FROM network_partners WHERE slug = ${data.slug}
        `;
        if (slugCheck.length > 0) {
          throw new Error('Slug already taken');
        }

        // Create the partner
        const [newPartner] = await tx`
          INSERT INTO network_partners (
            name, slug, type, industry, website, description,
            is_alumni_partner, alumni_institution, alumni_sport,
            alumni_graduation_year, alumni_position, alumni_years_on_team,
            primary_contact_name, primary_contact_email, primary_contact_phone,
            status, visibility
          ) VALUES (
            ${data.name},
            ${data.slug},
            ${data.type},
            ${data.industry || null},
            ${data.website || null},
            ${data.description || null},
            ${data.isAlumniPartner},
            ${data.alumniInstitution || null},
            ${data.alumniSport || null},
            ${data.alumniGraduationYear || null},
            ${data.alumniPosition || null},
            ${data.alumniYearsOnTeam || null},
            ${data.primaryContactName || null},
            ${data.primaryContactEmail || null},
            ${data.primaryContactPhone || null},
            'pending',
            'private'
          )
          RETURNING id
        `;
        partnerId = newPartner.id;
      }

      // Check for existing access row
      const existingAccess = await tx`
        SELECT id FROM tenant_partner_access
        WHERE tenant_id = ${tenantId} AND network_partner_id = ${partnerId}
      `;
      if (existingAccess.length > 0) {
        throw new Error('Partner is already linked to this tenant');
      }

      // Create tenant_partner_access with 'exclusive' relationship
      const [access] = await tx`
        INSERT INTO tenant_partner_access (
          tenant_id, network_partner_id, relationship,
          invited_by, custom_display_name, custom_description,
          featured_in_tenant, is_active
        ) VALUES (
          ${tenantId},
          ${partnerId},
          'exclusive',
          ${session.data.userId},
          ${data.customDisplayName || null},
          ${data.customDescription || null},
          ${data.featuredInTenant},
          true
        )
        RETURNING *
      `;

      // Fetch the full partner record
      const [partner] = await tx`
        SELECT * FROM network_partners WHERE id = ${partnerId}
      `;

      return { partner, access };
    });

    return NextResponse.json(
      {
        partner: {
          id: result.partner.id,
          name: result.partner.name,
          slug: result.partner.slug,
          type: result.partner.type,
          industry: result.partner.industry,
          website: result.partner.website,
          description: result.partner.description,
          isAlumniPartner: result.partner.is_alumni_partner,
          alumniInstitution: result.partner.alumni_institution,
          alumniSport: result.partner.alumni_sport,
          alumniGraduationYear: result.partner.alumni_graduation_year,
          alumniPosition: result.partner.alumni_position,
          status: result.partner.status,
          visibility: result.partner.visibility,
          primaryContactName: result.partner.primary_contact_name,
          primaryContactEmail: result.partner.primary_contact_email,
          createdAt: result.partner.created_at,
        },
        access: {
          id: result.access.id,
          tenantId: result.access.tenant_id,
          networkPartnerId: result.access.network_partner_id,
          relationship: result.access.relationship,
          invitedBy: result.access.invited_by,
          customDisplayName: result.access.custom_display_name,
          customDescription: result.access.custom_description,
          featuredInTenant: result.access.featured_in_tenant,
          isActive: result.access.is_active,
          createdAt: result.access.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invite partner error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Map known errors to appropriate status codes
    if (message === 'Partner not found') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === 'Slug already taken' ||
      message === 'Partner is already linked to this tenant'
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (
      message === 'Cannot invite an inactive partner' ||
      message === 'name, slug, and type are required when creating a new partner'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
