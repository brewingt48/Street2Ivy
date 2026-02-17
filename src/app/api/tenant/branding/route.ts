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
  // Enterprise customization fields (stored in branding JSONB)
  ctaHeadline: z.string().max(200).optional(),
  ctaSubheadline: z.string().max(500).optional(),
  footerText: z.string().max(500).optional(),
  sectionVisibility: z.object({
    competitiveLoop: z.boolean().optional(),
    valueProps: z.boolean().optional(),
    alumniPartners: z.boolean().optional(),
    about: z.boolean().optional(),
    gallery: z.boolean().optional(),
    socialContact: z.boolean().optional(),
    aiCoaching: z.boolean().optional(),
    networkEcosystem: z.boolean().optional(),
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
      SELECT id, branding, features,
             hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
             gallery_images, about_content, social_links, contact_info
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Read from individual columns (source of truth for landing page)
    // Enterprise fields from branding JSONB
    const brandingData = (tenant.branding || {}) as Record<string, unknown>;
    return NextResponse.json({
      branding: {
        heroVideoUrl: tenant.hero_video_url || '',
        heroHeadline: tenant.hero_headline || '',
        heroSubheadline: tenant.hero_subheadline || '',
        heroVideoPosterUrl: tenant.hero_video_poster_url || '',
        galleryImages: (tenant.gallery_images as string[]) || [],
        aboutContent: tenant.about_content || '',
        socialLinks: (tenant.social_links as Record<string, string>) || {},
        contactInfo: (tenant.contact_info as Record<string, string>) || {},
        // Enterprise customization fields (from branding JSONB)
        ctaHeadline: (brandingData.ctaHeadline as string) || '',
        ctaSubheadline: (brandingData.ctaSubheadline as string) || '',
        footerText: (brandingData.footerText as string) || '',
        sectionVisibility: (brandingData.sectionVisibility as Record<string, boolean>) || null,
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

    // Get current individual column values for merge
    const [current] = await sql`
      SELECT hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
             gallery_images, about_content, social_links, contact_info
      FROM tenants WHERE id = ${tenantId}
    `;

    // Also keep branding JSON in sync for backward compatibility
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
    // Enterprise customization fields (only for enterprise plan tenants)
    if (updates.ctaHeadline !== undefined) newBranding.ctaHeadline = updates.ctaHeadline;
    if (updates.ctaSubheadline !== undefined) newBranding.ctaSubheadline = updates.ctaSubheadline;
    if (updates.footerText !== undefined) newBranding.footerText = updates.footerText;
    if (updates.sectionVisibility !== undefined) newBranding.sectionVisibility = updates.sectionVisibility;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingJson = sql.json(newBranding as any);

    // Resolve individual column values
    const heroVideoUrl = updates.heroVideoUrl !== undefined ? updates.heroVideoUrl : (current.hero_video_url || null);
    const heroVideoPosterUrl = updates.heroVideoPosterUrl !== undefined ? updates.heroVideoPosterUrl : (current.hero_video_poster_url || null);
    const heroHeadline = updates.heroHeadline !== undefined ? updates.heroHeadline : (current.hero_headline || null);
    const heroSubheadline = updates.heroSubheadline !== undefined ? updates.heroSubheadline : (current.hero_subheadline || null);
    const aboutContent = updates.aboutContent !== undefined ? updates.aboutContent : (current.about_content || null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const galleryJson = updates.galleryImages !== undefined ? sql.json(updates.galleryImages as any) : sql.json((current.gallery_images || []) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socialJson = updates.socialLinks !== undefined ? sql.json(updates.socialLinks as any) : sql.json((current.social_links || {}) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactJson = updates.contactInfo !== undefined ? sql.json(updates.contactInfo as any) : sql.json((current.contact_info || {}) as any);

    // Write to BOTH branding JSON and individual columns (landing page reads individual columns)
    const [updated] = await sql`
      UPDATE tenants
      SET branding = ${brandingJson},
          hero_video_url = ${heroVideoUrl},
          hero_video_poster_url = ${heroVideoPosterUrl},
          hero_headline = ${heroHeadline},
          hero_subheadline = ${heroSubheadline},
          gallery_images = ${galleryJson},
          about_content = ${aboutContent},
          social_links = ${socialJson},
          contact_info = ${contactJson},
          updated_at = NOW()
      WHERE id = ${tenantId}
      RETURNING id, hero_video_url, hero_video_poster_url, hero_headline, hero_subheadline,
                gallery_images, about_content, social_links, contact_info
    `;

    return NextResponse.json({
      branding: {
        heroVideoUrl: updated.hero_video_url || '',
        heroHeadline: updated.hero_headline || '',
        heroSubheadline: updated.hero_subheadline || '',
        heroVideoPosterUrl: updated.hero_video_poster_url || '',
        galleryImages: updated.gallery_images || [],
        aboutContent: updated.about_content || '',
        socialLinks: updated.social_links || {},
        contactInfo: updated.contact_info || {},
        // Enterprise fields from updated branding JSONB
        ctaHeadline: newBranding.ctaHeadline || '',
        ctaSubheadline: newBranding.ctaSubheadline || '',
        footerText: newBranding.footerText || '',
        sectionVisibility: newBranding.sectionVisibility || null,
      },
    });
  } catch (error) {
    console.error('Tenant branding PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
