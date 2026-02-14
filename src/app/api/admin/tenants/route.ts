/**
 * GET /api/admin/tenants — List tenants with usage stats
 * POST /api/admin/tenants — Create a new tenant with edu admin user + credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import crypto from 'crypto';

const createTenantSchema = z.object({
  subdomain: z
    .string()
    .min(2, 'Subdomain must be at least 2 characters')
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Subdomain must be lowercase alphanumeric with optional hyphens'),
  name: z.string().min(1, 'Name is required').max(200),
  displayName: z.string().max(200).optional(),
  institutionDomain: z.string().optional(),
  institutionType: z.enum([
    'university', 'community_college', 'hbcu', 'trade_school',
    'bootcamp', 'nonprofit', 'government', 'workforce', 'corporate_training', 'other',
  ]).default('university'),
  allowedDomains: z.array(z.string()).optional(),
  plan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
  adminEmail: z.string().email('Valid admin email required'),
  adminFirstName: z.string().min(1, 'Admin first name required'),
  adminLastName: z.string().min(1, 'Admin last name required'),
  branding: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      heroVideoUrl: z.string().optional(),
    })
    .optional(),
  features: z
    .object({
      maxStudents: z.number().optional(),
      maxListings: z.number().optional(),
      aiCoaching: z.boolean().optional(),
      customBranding: z.boolean().optional(),
      analytics: z.boolean().optional(),
      apiAccess: z.boolean().optional(),
    })
    .optional(),
});

/** Generate a secure random password */
function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

/** Default feature sets per plan */
const planDefaults: Record<string, Record<string, unknown>> = {
  starter: {
    maxStudents: 100,
    maxListings: 10,
    aiCoaching: false,
    customBranding: false,
    analytics: false,
    apiAccess: false,
  },
  professional: {
    maxStudents: 500,
    maxListings: 50,
    aiCoaching: true,
    customBranding: true,
    analytics: true,
    apiAccess: false,
  },
  enterprise: {
    maxStudents: -1, // unlimited
    maxListings: -1,
    aiCoaching: true,
    customBranding: true,
    analytics: true,
    apiAccess: true,
  },
};

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get tenants with usage counts
    const tenants = await sql`
      SELECT
        t.id, t.subdomain, t.name, t.display_name, t.status,
        t.institution_domain, t.branding, t.features,
        t.created_at, t.updated_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS student_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'corporate_partner') AS corporate_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'educational_admin') AS admin_count,
        COUNT(DISTINCT l.id) AS listing_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      LEFT JOIN listings l ON l.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({
      tenants: tenants.map((t: Record<string, unknown>) => ({
        id: t.id,
        subdomain: t.subdomain,
        name: t.name,
        displayName: t.display_name,
        status: t.status,
        institutionDomain: t.institution_domain,
        branding: t.branding,
        features: t.features,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        stats: {
          students: Number(t.student_count) || 0,
          corporates: Number(t.corporate_count) || 0,
          admins: Number(t.admin_count) || 0,
          listings: Number(t.listing_count) || 0,
        },
      })),
    });
  } catch (error) {
    console.error('Admin tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { subdomain, name, displayName, institutionDomain, institutionType, allowedDomains, plan, adminEmail, adminFirstName, adminLastName, branding, features } = parsed.data;

    // Check subdomain uniqueness
    const existing = await sql`SELECT id FROM tenants WHERE subdomain = ${subdomain}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
    }

    // Check admin email uniqueness
    const existingUser = await sql`SELECT id FROM users WHERE email = ${adminEmail.toLowerCase()}`;
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'Admin email already registered' }, { status: 409 });
    }

    // Build allowed domains list — includes institution domain by default if provided
    const effectiveDomains = [...(allowedDomains || [])];
    if (institutionDomain && !effectiveDomains.includes(institutionDomain)) {
      effectiveDomains.push(institutionDomain);
    }

    // Merge plan defaults with custom features + institution metadata
    const mergedFeatures = {
      ...planDefaults[plan],
      ...features,
      plan,
      institutionType,
      allowedDomains: effectiveDomains,
    };
    const mergedBranding = branding || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingJson = sql.json(mergedBranding as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresJson = sql.json(mergedFeatures as any);

    // Generate secure password for edu admin
    const adminPassword = generatePassword(16);

    // Create tenant + edu admin user in transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sql.begin(async (tx: any) => {
      // 1. Create institution if domain provided
      if (institutionDomain) {
        await tx`
          INSERT INTO institutions (domain, name, membership_status)
          VALUES (${institutionDomain}, ${name}, 'active')
          ON CONFLICT (domain) DO NOTHING
        `;
      }

      // 2. Create tenant
      const [tenant] = await tx`
        INSERT INTO tenants (subdomain, name, display_name, institution_domain, branding, features)
        VALUES (${subdomain}, ${name}, ${displayName || name}, ${institutionDomain || null}, ${brandingJson}, ${featuresJson})
        RETURNING id, subdomain, name, display_name, status, institution_domain, branding, features, created_at
      `;

      // 3. Create edu admin user with hashed password
      const [adminUser] = await tx`
        INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, tenant_id, institution_domain)
        VALUES (
          ${adminEmail.toLowerCase()},
          crypt(${adminPassword}, gen_salt('bf', 10)),
          ${adminFirstName},
          ${adminLastName},
          'educational_admin',
          true,
          ${tenant.id},
          ${institutionDomain || null}
        )
        RETURNING id, email, first_name, last_name, role
      `;

      return { tenant, adminUser };
    });

    return NextResponse.json(
      {
        tenant: {
          id: result.tenant.id,
          subdomain: result.tenant.subdomain,
          name: result.tenant.name,
          displayName: result.tenant.display_name,
          status: result.tenant.status,
          institutionDomain: result.tenant.institution_domain,
          branding: result.tenant.branding,
          features: result.tenant.features,
          createdAt: result.tenant.created_at,
        },
        admin: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          firstName: result.adminUser.first_name,
          lastName: result.adminUser.last_name,
          role: result.adminUser.role,
        },
        credentials: {
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          loginUrl: `https://${subdomain}.campus2career.com/login`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tenant error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
