/**
 * GET  /api/education/huddle/branding — Get huddle branding for the tenant (admin)
 * PUT  /api/education/huddle/branding — Update huddle branding (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { z } from 'zod';

const huddleBrandingSchema = z.object({
  bannerType: z.enum(['image', 'video', 'none']).optional(),
  bannerImageUrl: z.string().max(500).optional().nullable(),
  bannerVideoUrl: z.string().max(500).optional().nullable(),
  bannerOverlayOpacity: z.number().min(0).max(1).optional(),
  logoUrl: z.string().max(500).optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  welcomeTitle: z.string().max(300).optional().nullable(),
  welcomeMessage: z.string().max(2000).optional().nullable(),
  layoutConfig: z.object({
    featuredSectionTitle: z.string().max(100).optional(),
    topicSections: z.array(z.object({
      topicId: z.string().uuid(),
      title: z.string().max(100).optional(),
      order: z.number().int().min(0),
    })).max(20).optional(),
    showContentTypes: z.array(z.enum(['video', 'article', 'pdf', 'audio', 'text_post'])).optional(),
    sectionOrder: z.array(z.string()).max(10).optional(),
    maxFeaturedPosts: z.number().int().min(1).max(12).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    // Get huddle branding + tenant defaults in one query
    const result = await sql`
      SELECT
        hb.banner_type,
        hb.banner_image_url,
        hb.banner_video_url,
        hb.banner_overlay_opacity,
        hb.logo_url AS huddle_logo_url,
        hb.primary_color AS huddle_primary_color,
        hb.secondary_color AS huddle_secondary_color,
        hb.welcome_title,
        hb.welcome_message,
        hb.layout_config,
        t.display_name AS tenant_name,
        t.branding AS tenant_branding
      FROM tenants t
      LEFT JOIN huddle_branding hb ON hb.tenant_id = t.id
      WHERE t.id = ${tenantId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const row = result[0];
    const tenantBranding = (row.tenant_branding as Record<string, string>) || {};

    return NextResponse.json({
      branding: {
        bannerType: row.banner_type || 'image',
        bannerImageUrl: row.banner_image_url || null,
        bannerVideoUrl: row.banner_video_url || null,
        bannerOverlayOpacity: row.banner_overlay_opacity != null ? Number(row.banner_overlay_opacity) : 0.4,
        logoUrl: row.huddle_logo_url || tenantBranding.logoUrl || null,
        primaryColor: row.huddle_primary_color || tenantBranding.primaryColor || '#0f766e',
        secondaryColor: row.huddle_secondary_color || tenantBranding.secondaryColor || '#f8fafc',
        welcomeTitle: row.welcome_title || null,
        welcomeMessage: row.welcome_message || null,
        layoutConfig: row.layout_config || {},
      },
      tenantDefaults: {
        name: row.tenant_name,
        logoUrl: tenantBranding.logoUrl || null,
        primaryColor: tenantBranding.primaryColor || '#0f766e',
        secondaryColor: tenantBranding.secondaryColor || '#f8fafc',
      },
    });
  } catch (error) {
    console.error('Get huddle branding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = huddleBrandingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // UPSERT into huddle_branding
    await sql`
      INSERT INTO huddle_branding (
        tenant_id,
        banner_type,
        banner_image_url,
        banner_video_url,
        banner_overlay_opacity,
        logo_url,
        primary_color,
        secondary_color,
        welcome_title,
        welcome_message,
        layout_config,
        updated_at
      ) VALUES (
        ${tenantId},
        ${data.bannerType || 'image'},
        ${data.bannerImageUrl || null},
        ${data.bannerVideoUrl || null},
        ${data.bannerOverlayOpacity ?? 0.4},
        ${data.logoUrl || null},
        ${data.primaryColor || null},
        ${data.secondaryColor || null},
        ${data.welcomeTitle || null},
        ${data.welcomeMessage || null},
        ${JSON.stringify(data.layoutConfig || {})},
        NOW()
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        banner_type = EXCLUDED.banner_type,
        banner_image_url = EXCLUDED.banner_image_url,
        banner_video_url = EXCLUDED.banner_video_url,
        banner_overlay_opacity = EXCLUDED.banner_overlay_opacity,
        logo_url = EXCLUDED.logo_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        welcome_title = EXCLUDED.welcome_title,
        welcome_message = EXCLUDED.welcome_message,
        layout_config = EXCLUDED.layout_config,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update huddle branding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
