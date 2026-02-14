/**
 * POST /api/auth/register
 *
 * Register a new user account.
 * Password hashing delegates to PostgreSQL crypt() + gen_salt().
 * Creates a session and sets an httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/auth/validation';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { generateSessionId, setSessionCookie } from '@/lib/auth/cookies';
import { getUserByEmail } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import type { SessionData } from '@/lib/auth/types';
import { sendEmail, welcomeEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, role } = parsed.data;

    // Check if email already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password via PostgreSQL
    const passwordHash = await hashPassword(password);

    // Get tenant ID from header (set by middleware)
    const tenantId = request.headers.get('x-tenant-id') || process.env.TENANT_ID || null;

    // For students: validate email domain against tenant's allowed domains
    if (role === 'student' && tenantId) {
      const [tenant] = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
      if (tenant) {
        const features = (tenant.features || {}) as Record<string, unknown>;
        const allowedDomains = (features.allowedDomains || []) as string[];
        if (allowedDomains.length > 0) {
          const emailDomain = email.split('@')[1]?.toLowerCase();
          const domainAllowed = allowedDomains.some(
            (d: string) => emailDomain === d.toLowerCase() || emailDomain?.endsWith('.' + d.toLowerCase())
          );
          if (!domainAllowed) {
            return NextResponse.json(
              {
                error: `Students must register with an email from: ${allowedDomains.join(', ')}`,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // For corporate partners: set initial approval status to pending
    const corporateStatus = role === 'corporate_partner' ? 'pending_approval' : null;

    // Insert user — display_name is GENERATED ALWAYS, do NOT include
    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id, email_verified, metadata)
      VALUES (
        ${email}, ${passwordHash}, ${firstName}, ${lastName}, ${role}, ${tenantId}, false,
        ${corporateStatus ? JSON.stringify({ approvalStatus: 'pending_approval' }) : '{}'}::jsonb
      )
      RETURNING id, email, role, first_name, last_name, display_name, email_verified, tenant_id, avatar_url
    `;

    const user = result[0];

    // Create session
    const sid = generateSessionId();
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      createdAt: Date.now(),
    };

    await createSession(sid, sessionData);

    // Set session cookie
    setSessionCookie(sid);

    // Send welcome email (fire-and-forget — don't block registration)
    const welcome = welcomeEmail({ firstName, role });
    sendEmail({ to: email, ...welcome, tags: ['welcome'] }).catch(() => {});

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          displayName: user.display_name,
          emailVerified: user.email_verified,
          avatarUrl: user.avatar_url,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
