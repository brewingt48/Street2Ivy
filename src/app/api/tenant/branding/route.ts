/**
 * GET /api/tenant/branding — Get tenant branding columns (hero, gallery, about, social, contact)
 * PUT /api/tenant/branding — Update tenant branding columns
 *
 * Requires educational_admin role for the tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateBrandingSchema = z.object({
  heroVideoUrl: z.string().max(500).optional(),
  heroHeadline: z.string().max(200).optional(),
  heroSubheadline: z.string().max(500).optional(),
  heroVideoPosterUrl: z.string().max(500).optional(),
  galleryImages: z.array(z.string().max(500)).max(20).optional(),
  aboutContent: z.string().max(5000).optional(),
  socialLinks: z.object({
    twitter: z.string().max(300).optional(),
    instagram: z.string().max(300).optional(),
    tiktok: z.string().max(300).optional(),
    youtube: z.string().max(300).optional(),
    linkedin: z.string().max(300).optional(),
  }).optional(),
  contactInfo: z.object({
    email: z.string().max(300).optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
  }).optional(),
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
      SELECT id, branding, features
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const branding = (tenant.branding || {}) as Record<string, unknown>;

    return NextResponse.json({
      branding: {
        heroVideoUrl: branding.heroVideoUrl || '',
        heroHeadline: branding.heroHeadline || '',
        heroSubheadline: branding.heroSubheadline || '',
        heroVideoPosterUrl: branding.heroVideoPosterUrl || '',
        galleryImages: (branding.galleryImages as string[]) || [],
        aboutContent: branding.aboutContent || '',
        socialLinks: (branding.socialLinks as Record<string, string>) || {},
        contactInfo: (branding.contactInfo as Record<string, string>) || {},
      },
    });
  } catch (error) {
    console.error('Tenant branding GET error:', error);
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
    const parsed = updateBrandingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const [tenant] = await sql`
      SELECT branding, features FROM tenants WHERE id = ${tenantId}
    `;
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const features = (tenant.features || {}) as Record<string, unknown>;
    if (!features.customBranding) {
      return NextResponse.json(
        { error: 'Custom branding is not available on your current plan. Please upgrade to Professional or Enterprise.' },
        { status: 403 }
      );
    }

    const currentBranding = (tenant.branding || {}) as Record<string, unknown>;
    const newBranding = { ...currentBranding };

    if (updates.heroVideoUrl !== undefined) newBranding.heroVideoUrl = updates.heroVideoUrl;
    if (updates.heroHeadline !== undefined) newBranding.heroHeadline = updates.heroHeadline;
    if (updates.heroSubheadline !== undefined) newBranding.heroSubheadline = updates.heroSubheadline;
    if (updates.heroVideoPosterUrl !== undefined) newBranding.heroVideoPosterUrl = updates.heroVideoPosterUrl;
    if (updates.galleryImages !== undefined) newBranding.galleryImages = updates.galleryImages;
    if (updates.aboutContent !== undefined) newBranding.aboutContent = updates.aboutContent;
    if (updates.socialLinks !== undefined) newBranding.socialLinks = updates.socialLinks;
    if (updates.contactInfo !== undefined) newBranding.contactInfo = updates.contactInfo;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingJson = sql.json(newBranding as any);

    const [updated] = await sql`
      UPDATE tenants
      SET branding = ${brandingJson}, updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING id, branding
    `;

    return NextResponse.json({
      branding: updated.branding,
    });
  } catch (error) {
    console.error('Tenant branding PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
