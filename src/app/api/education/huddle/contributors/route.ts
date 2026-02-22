/**
 * GET  /api/education/huddle/contributors — List contributors with post counts
 * POST /api/education/huddle/contributors — Invite a contributor
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { sanitizeString } from '@/lib/security/sanitize';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['alumni', 'partner', 'admin']),
  title: z.string().max(200).optional(),
  classYear: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const contributors = await sql`
      SELECT
        c.id, c.user_id, c.role, c.title, c.class_year, c.bio,
        c.is_active, c.invited_at, c.created_at,
        u.display_name AS name, u.email, u.avatar_url,
        (SELECT COUNT(*)::int FROM huddle_posts p WHERE p.contributor_id = c.id) AS post_count,
        (SELECT COUNT(*)::int FROM huddle_posts p WHERE p.contributor_id = c.id AND p.status = 'published') AS published_count
      FROM huddle_contributors c
      JOIN users u ON u.id = c.user_id
      WHERE c.tenant_id = ${tenantId}
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({
      contributors: contributors.map((c: Record<string, unknown>) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        email: c.email,
        avatarUrl: c.avatar_url,
        role: c.role,
        title: c.title,
        classYear: c.class_year,
        bio: c.bio,
        isActive: c.is_active,
        invitedAt: c.invited_at,
        postCount: c.post_count,
        publishedCount: c.published_count,
      })),
    });
  } catch (error) {
    console.error('Admin huddle contributors list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !['educational_admin', 'admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    const allowed = await hasFeature(tenantId, 'teamHuddle');
    if (!allowed) {
      return NextResponse.json({ error: 'Team Huddle is not available on your current plan' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const rl = checkRateLimit(`huddle:invite:${session.data.userId}`, RATE_LIMITS.write);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = parsed.data;

    // Look up user by email
    const users = await sql`
      SELECT id, display_name FROM users
      WHERE email = ${data.email} AND tenant_id = ${tenantId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'No user found with this email in your institution' }, { status: 404 });
    }

    const userId = users[0].id as string;

    // Check for existing contributor
    const existing = await sql`
      SELECT id FROM huddle_contributors WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'This user is already a contributor' }, { status: 409 });
    }

    // Create contributor
    const result = await sql`
      INSERT INTO huddle_contributors (tenant_id, user_id, role, title, class_year, bio, invited_by)
      VALUES (
        ${tenantId}, ${userId}, ${data.role},
        ${data.title ? sanitizeString(data.title) : null},
        ${data.classYear || null},
        ${data.bio ? sanitizeString(data.bio) : null},
        ${session.data.userId}
      )
      RETURNING id
    `;

    // Audit log
    await sql`
      INSERT INTO huddle_audit_log (tenant_id, actor_id, action, target_type, target_id, metadata)
      VALUES (${tenantId}, ${session.data.userId}, 'contributor_invited', 'contributor', ${result[0].id}, ${JSON.stringify({ email: data.email, role: data.role })}::jsonb)
    `;

    // Notify contributor
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${userId},
        'huddle_contributor_invited',
        'You''ve been invited as a Team Huddle contributor',
        'You have been invited to contribute content to Team Huddle. Share your insights and help students learn from your experience.',
        ${JSON.stringify({ contributorId: result[0].id, role: data.role })}::jsonb
      )
    `;

    return NextResponse.json({ contributor: { id: result[0].id } }, { status: 201 });
  } catch (error) {
    console.error('Admin invite huddle contributor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
