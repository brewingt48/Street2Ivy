/**
 * GET /api/admin/settings — Get platform-wide admin settings
 * PUT /api/admin/settings — Update platform-wide admin settings
 *
 * Settings stored in landing_content table with section = 'platform_settings'
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

const updateSettingsSchema = z.object({
  aiCoachingUrl: z.string().optional(),
  aiCoachingEnabled: z.boolean().optional(),
  bookDemoUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  hiddenSections: z.array(z.string()).optional(),
  heroCopy: z.object({
    tagline: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
  }).optional(),
  problemCopy: z.object({
    headline: z.string().optional(),
    description: z.string().optional(),
    stats: z.array(z.object({
      value: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
  }).optional(),
  howItWorksCopy: z.object({
    headline: z.string().optional(),
    steps: z.array(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
  }).optional(),
  socialProofCopy: z.object({
    stats: z.array(z.object({
      number: z.string().optional(),
      label: z.string().optional(),
    })).optional(),
    testimonialQuote: z.string().optional(),
    testimonialAuthor: z.string().optional(),
    testimonialTitle: z.string().optional(),
  }).optional(),
  ctaCopy: z.object({
    headline: z.string().optional(),
    subheadline: z.string().optional(),
  }).optional(),
  heroCarousel: z.object({
    images: z.array(z.object({
      src: z.string().max(500),
      alt: z.string().max(200),
    })).max(20).optional(),
    intervalMs: z.number().min(1000).max(15000).optional(),
  }).optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [row] = await sql`
      SELECT content FROM landing_content WHERE section = 'platform_settings'
    `;

    const settings = (row?.content || {}) as Record<string, unknown>;

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get existing settings and merge
    const [existing] = await sql`
      SELECT content FROM landing_content WHERE section = 'platform_settings'
    `;
    const currentSettings = (existing?.content || {}) as Record<string, unknown>;
    const newSettings = { ...currentSettings };

    // Merge only provided fields (shallow merge for simple values, deep merge for objects)
    const updates = parsed.data;
    if (updates.aiCoachingUrl !== undefined) newSettings.aiCoachingUrl = updates.aiCoachingUrl;
    if (updates.aiCoachingEnabled !== undefined) newSettings.aiCoachingEnabled = updates.aiCoachingEnabled;
    if (updates.bookDemoUrl !== undefined) newSettings.bookDemoUrl = updates.bookDemoUrl;
    if (updates.logoUrl !== undefined) newSettings.logoUrl = updates.logoUrl;
    if (updates.hiddenSections !== undefined) newSettings.hiddenSections = updates.hiddenSections;
    if (updates.heroCopy !== undefined) newSettings.heroCopy = { ...(currentSettings.heroCopy as Record<string, unknown> || {}), ...updates.heroCopy };
    if (updates.problemCopy !== undefined) newSettings.problemCopy = { ...(currentSettings.problemCopy as Record<string, unknown> || {}), ...updates.problemCopy };
    if (updates.howItWorksCopy !== undefined) newSettings.howItWorksCopy = { ...(currentSettings.howItWorksCopy as Record<string, unknown> || {}), ...updates.howItWorksCopy };
    if (updates.socialProofCopy !== undefined) newSettings.socialProofCopy = { ...(currentSettings.socialProofCopy as Record<string, unknown> || {}), ...updates.socialProofCopy };
    if (updates.ctaCopy !== undefined) newSettings.ctaCopy = { ...(currentSettings.ctaCopy as Record<string, unknown> || {}), ...updates.ctaCopy };
    if (updates.heroCarousel !== undefined) newSettings.heroCarousel = updates.heroCarousel;

    await sql`
      INSERT INTO landing_content (section, content, updated_by, updated_at)
      VALUES ('platform_settings', ${JSON.stringify(newSettings)}::jsonb, ${session.data.userId}, NOW())
      ON CONFLICT (section) DO UPDATE SET
        content = ${JSON.stringify(newSettings)}::jsonb,
        updated_by = ${session.data.userId},
        updated_at = NOW()
    `;

    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
