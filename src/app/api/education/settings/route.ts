/**
 * GET /api/education/settings — Get tenant branding/settings for edu admin
 * PUT /api/education/settings — Update tenant branding/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  displayName: z.string().max(200).optional(),
  branding: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      heroVideoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
      welcomeMessage: z.string().optional(),
      tagline: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const [tenant] = await sql`
      SELECT id, subdomain, name, display_name, status, institution_domain,
             branding, features, created_at
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get institution info
    let institution = null;
    if (tenant.institution_domain) {
      const [inst] = await sql`
        SELECT domain, name, ai_coaching_enabled, ai_coaching_url
        FROM institutions
        WHERE domain = ${tenant.institution_domain}
      `;
      if (inst) {
        institution = {
          domain: inst.domain,
          name: inst.name,
          aiCoachingEnabled: inst.ai_coaching_enabled,
          aiCoachingUrl: inst.ai_coaching_url,
        };
      }
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        displayName: tenant.display_name,
        status: tenant.status,
        institutionDomain: tenant.institution_domain,
        branding: tenant.branding || {},
        features: tenant.features || {},
        createdAt: tenant.created_at,
      },
      institution,
    });
  } catch (error) {
    console.error('Education settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Check if custom branding is allowed
    const [tenant] = await sql`
      SELECT branding, features, display_name FROM tenants WHERE id = ${tenantId}
    `;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currentBranding = (tenant.branding || {}) as Record<string, unknown>;
    const features = (tenant.features || {}) as Record<string, unknown>;

    // Only allow branding updates if custom branding is enabled
    if (updates.branding && !features.customBranding) {
      return NextResponse.json(
        { error: 'Custom branding is not available on your current plan. Please upgrade to Professional or Enterprise.' },
        { status: 403 }
      );
    }

    const newBranding = updates.branding
      ? { ...currentBranding, ...updates.branding }
      : currentBranding;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingJson = sql.json(newBranding as any);

    const [updated] = await sql`
      UPDATE tenants
      SET
        display_name = ${updates.displayName ?? tenant.display_name ?? ''},
        branding = ${brandingJson},
        updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING id, subdomain, name, display_name, branding, features
    `;

    return NextResponse.json({
      tenant: {
        id: updated.id,
        subdomain: updated.subdomain,
        name: updated.name,
        displayName: updated.display_name,
        branding: updated.branding,
        features: updated.features,
      },
    });
  } catch (error) {
    console.error('Education settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
