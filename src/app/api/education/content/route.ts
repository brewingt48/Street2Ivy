/**
 * GET /api/education/content — Get tenant-specific content overrides
 * PUT /api/education/content — Update tenant-specific content
 *
 * Uses the tenant_content table keyed by institution domain.
 * Allows education admins to customize their landing page content
 * (hero copy, problem section, testimonials, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateContentSchema = z.object({
  heroCopy: z.object({
    tagline: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
  }).optional(),
  welcomeMessage: z.string().optional(),
  ctaCopy: z.object({
    headline: z.string().optional(),
    subheadline: z.string().optional(),
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
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get tenant's institution domain
    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const [tenant] = await sql`
      SELECT institution_domain FROM tenants WHERE id = ${tenantId}
    `;

    if (!tenant?.institution_domain) {
      return NextResponse.json({ content: {}, message: 'No institution domain configured' });
    }

    const [row] = await sql`
      SELECT content, updated_at FROM tenant_content WHERE domain = ${tenant.institution_domain}
    `;

    return NextResponse.json({
      content: (row?.content || {}) as Record<string, unknown>,
      domain: tenant.institution_domain,
      updatedAt: row?.updated_at || null,
    });
  } catch (error) {
    console.error('Education content GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.data.role !== 'educational_admin' && session.data.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const [tenant] = await sql`
      SELECT institution_domain, features FROM tenants WHERE id = ${tenantId}
    `;

    if (!tenant?.institution_domain) {
      return NextResponse.json({ error: 'No institution domain configured. Contact your admin.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get existing content and merge
    const [existing] = await sql`
      SELECT content FROM tenant_content WHERE domain = ${tenant.institution_domain}
    `;
    const currentContent = (existing?.content || {}) as Record<string, unknown>;
    const updates = parsed.data;

    const newContent = { ...currentContent };
    if (updates.heroCopy !== undefined) newContent.heroCopy = { ...(currentContent.heroCopy as Record<string, unknown> || {}), ...updates.heroCopy };
    if (updates.welcomeMessage !== undefined) newContent.welcomeMessage = updates.welcomeMessage;
    if (updates.ctaCopy !== undefined) newContent.ctaCopy = { ...(currentContent.ctaCopy as Record<string, unknown> || {}), ...updates.ctaCopy };
    if (updates.socialProofCopy !== undefined) newContent.socialProofCopy = { ...(currentContent.socialProofCopy as Record<string, unknown> || {}), ...updates.socialProofCopy };

    await sql`
      INSERT INTO tenant_content (domain, content, updated_by, updated_at)
      VALUES (${tenant.institution_domain}, ${JSON.stringify(newContent)}::jsonb, ${session.data.userId}, NOW())
      ON CONFLICT (domain) DO UPDATE SET
        content = ${JSON.stringify(newContent)}::jsonb,
        updated_by = ${session.data.userId},
        updated_at = NOW()
    `;

    return NextResponse.json({ content: newContent });
  } catch (error) {
    console.error('Education content PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
