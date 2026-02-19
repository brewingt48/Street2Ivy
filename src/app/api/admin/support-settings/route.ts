/**
 * GET /api/admin/support-settings — Get platform support/contact settings
 *   (Any authenticated user can read — dashboards need this)
 * PUT /api/admin/support-settings — Update platform support/contact settings
 *   (Admin only)
 *
 * Settings stored in landing_content table with section = 'support_settings'
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const SECTION_KEY = 'support_settings';

const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: 'support@proveground.com',
  supportPhone: '',
  officeHours: 'Mon-Fri 9am-5pm EST',
  helpCenterUrl: '',
  supportMessage:
    'Need help? Reach out to our support team and we will get back to you as soon as possible.',
};

const updateSupportSettingsSchema = z.object({
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  officeHours: z.string().optional(),
  helpCenterUrl: z.string().url().or(z.literal('')).optional(),
  supportMessage: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [row] = await sql`
      SELECT content FROM landing_content WHERE section = ${SECTION_KEY}
    `;

    const stored = (row?.content || {}) as Record<string, unknown>;

    // Merge with defaults so callers always get a complete shape
    const settings = {
      supportEmail:
        (stored.supportEmail as string) || DEFAULT_SUPPORT_SETTINGS.supportEmail,
      supportPhone:
        (stored.supportPhone as string) ?? DEFAULT_SUPPORT_SETTINGS.supportPhone,
      officeHours:
        (stored.officeHours as string) || DEFAULT_SUPPORT_SETTINGS.officeHours,
      helpCenterUrl:
        (stored.helpCenterUrl as string) ?? DEFAULT_SUPPORT_SETTINGS.helpCenterUrl,
      supportMessage:
        (stored.supportMessage as string) || DEFAULT_SUPPORT_SETTINGS.supportMessage,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Support settings GET error:', error);
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
    const parsed = updateSupportSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get existing settings and merge
    const [existing] = await sql`
      SELECT content FROM landing_content WHERE section = ${SECTION_KEY}
    `;
    const currentSettings = (existing?.content || {}) as Record<string, unknown>;
    const newSettings = { ...currentSettings };

    // Merge only provided fields
    const updates = parsed.data;
    if (updates.supportEmail !== undefined) newSettings.supportEmail = updates.supportEmail;
    if (updates.supportPhone !== undefined) newSettings.supportPhone = updates.supportPhone;
    if (updates.officeHours !== undefined) newSettings.officeHours = updates.officeHours;
    if (updates.helpCenterUrl !== undefined) newSettings.helpCenterUrl = updates.helpCenterUrl;
    if (updates.supportMessage !== undefined) newSettings.supportMessage = updates.supportMessage;

    await sql`
      INSERT INTO landing_content (section, content, updated_by, updated_at)
      VALUES (${SECTION_KEY}, ${JSON.stringify(newSettings)}::jsonb, ${session.data.userId}, NOW())
      ON CONFLICT (section) DO UPDATE SET
        content = ${JSON.stringify(newSettings)}::jsonb,
        updated_by = ${session.data.userId},
        updated_at = NOW()
    `;

    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    console.error('Support settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
