/**
 * GET /api/admin/homepage — Public endpoint returning homepage settings
 * (No auth required — used by the landing page to read admin-configured settings)
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const [row] = await sql`
      SELECT content FROM landing_content WHERE section = 'platform_settings'
    `;

    const settings = (row?.content || {}) as Record<string, unknown>;

    // Only return the public-safe subset
    return NextResponse.json({
      bookDemoUrl: settings.bookDemoUrl || 'https://calendly.com',
      logoUrl: settings.logoUrl || '',
      hiddenSections: settings.hiddenSections || [],
      aiCoachingEnabled: settings.aiCoachingEnabled || false,
      heroCopy: settings.heroCopy || {},
      problemCopy: settings.problemCopy || {},
      ctaCopy: settings.ctaCopy || {},
    });
  } catch (error) {
    console.error('Homepage settings error:', error);
    return NextResponse.json({
      bookDemoUrl: 'https://calendly.com',
      logoUrl: '',
      hiddenSections: [],
      aiCoachingEnabled: false,
      heroCopy: {},
      problemCopy: {},
      ctaCopy: {},
    });
  }
}
