/**
 * GET /api/admin/tenants — List tenants
 * POST /api/admin/tenants — Create a new tenant using create_tenant()
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const createTenantSchema = z.object({
  subdomain: z.string().min(1).max(63),
  name: z.string().min(1).max(200),
  institutionDomain: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenants = await sql`
      SELECT id, subdomain, name, display_name, status, institution_domain,
             branding, features, created_at, updated_at
      FROM tenants
      ORDER BY created_at DESC
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
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { subdomain, name, institutionDomain } = parsed.data;

    // Use create_tenant() stored procedure if available, else insert directly
    const result = await sql`
      INSERT INTO tenants (subdomain, name, institution_domain)
      VALUES (${subdomain}, ${name}, ${institutionDomain || null})
      RETURNING id, subdomain, name, status, created_at
    `;

    return NextResponse.json({ tenant: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
