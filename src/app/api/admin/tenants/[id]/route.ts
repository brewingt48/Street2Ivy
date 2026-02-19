/**
 * GET /api/admin/tenants/[id] — Get tenant detail with stats
 * PUT /api/admin/tenants/[id] — Update tenant settings
 * DELETE /api/admin/tenants/[id] — Suspend tenant (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  displayName: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  branding: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      logoUrl: z.string().optional(),
      heroVideoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
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
      aiCoachingEnabled: z.boolean().optional(),
      advancedReporting: z.boolean().optional(),
      studentRatings: z.boolean().optional(),
      corporateRatings: z.boolean().optional(),
      matchingAlgorithm: z.boolean().optional(),
      issueReporting: z.boolean().optional(),
      inviteManagement: z.boolean().optional(),
      plan: z.string().optional(),
      upgradeRequestPending: z.boolean().optional(),
      requestedPlan: z.string().optional(),
      institutionType: z.string().optional(),
      allowedDomains: z.array(z.string()).optional(),
    })
    .optional(),
  // Athletic program fields
  marketplaceType: z.enum(['institution', 'athletic']).optional(),
  sport: z.string().max(100).optional().nullable(),
  teamName: z.string().max(100).optional().nullable(),
  conference: z.string().max(200).optional().nullable(),
  sharedNetworkEnabled: z.boolean().optional(),
  networkTier: z.enum(['basic', 'full']).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [tenant] = await sql`
      SELECT
        t.id, t.subdomain, t.name, t.display_name, t.status,
        t.institution_domain, t.branding, t.features,
        t.marketplace_type, t.sport, t.team_name, t.conference,
        t.shared_network_enabled, t.network_tier,
        t.created_at, t.updated_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS student_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'corporate_partner') AS corporate_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'educational_admin') AS admin_count,
        COUNT(DISTINCT l.id) AS listing_count,
        COUNT(DISTINCT pa.id) AS application_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      LEFT JOIN listings l ON l.tenant_id = t.id
      LEFT JOIN project_applications pa ON pa.tenant_id = t.id
      WHERE t.id = ${id}
      GROUP BY t.id
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get tenant admins
    const admins = await sql`
      SELECT id, email, first_name, last_name, last_login_at, created_at
      FROM users
      WHERE tenant_id = ${id} AND role = 'educational_admin'
      ORDER BY created_at ASC
    `;

    // Get recent activity (last 10 users who joined)
    const recentUsers = await sql`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users
      WHERE tenant_id = ${id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        displayName: tenant.display_name,
        status: tenant.status,
        institutionDomain: tenant.institution_domain,
        branding: tenant.branding,
        features: tenant.features,
        marketplaceType: tenant.marketplace_type || 'institution',
        sport: tenant.sport,
        teamName: tenant.team_name,
        conference: tenant.conference,
        sharedNetworkEnabled: tenant.shared_network_enabled || false,
        networkTier: tenant.network_tier || 'basic',
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
        stats: {
          students: Number(tenant.student_count) || 0,
          corporates: Number(tenant.corporate_count) || 0,
          admins: Number(tenant.admin_count) || 0,
          listings: Number(tenant.listing_count) || 0,
          applications: Number(tenant.application_count) || 0,
        },
      },
      admins: admins.map((a: Record<string, unknown>) => ({
        id: a.id,
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
        lastLoginAt: a.last_login_at,
        createdAt: a.created_at,
      })),
      recentUsers: recentUsers.map((u: Record<string, unknown>) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        createdAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Build dynamic update
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name');
      values.push(updates.name);
    }
    if (updates.displayName !== undefined) {
      setClauses.push('display_name');
      values.push(updates.displayName);
    }
    if (updates.status !== undefined) {
      setClauses.push('status');
      values.push(updates.status);
    }

    // For JSONB fields, merge with existing
    const [current] = await sql`
      SELECT branding, features, name, display_name, status,
             marketplace_type, sport, team_name, conference,
             shared_network_enabled, network_tier
      FROM tenants WHERE id = ${id}
    `;
    if (!current) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currentBranding = (current.branding || {}) as Record<string, unknown>;
    const currentFeatures = (current.features || {}) as Record<string, unknown>;

    const newBranding = updates.branding ? { ...currentBranding, ...updates.branding } : currentBranding;
    const newFeatures = updates.features ? { ...currentFeatures, ...updates.features } : currentFeatures;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandingJson = sql.json(newBranding as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featuresJson = sql.json(newFeatures as any);

    // Athletic / network fields
    const marketplaceType = updates.marketplaceType ?? current.marketplace_type ?? 'institution';
    const sport = updates.sport !== undefined ? updates.sport : current.sport;
    const teamName = updates.teamName !== undefined ? updates.teamName : current.team_name;
    const conference = updates.conference !== undefined ? updates.conference : current.conference;
    const sharedNetworkEnabled = updates.sharedNetworkEnabled ?? current.shared_network_enabled ?? false;
    const networkTier = updates.networkTier ?? current.network_tier ?? 'basic';

    const [updated] = await sql`
      UPDATE tenants
      SET
        name = ${updates.name ?? current.name ?? ''},
        display_name = ${updates.displayName ?? current.display_name ?? ''},
        status = ${updates.status ?? current.status ?? 'active'},
        branding = ${brandingJson},
        features = ${featuresJson},
        marketplace_type = ${marketplaceType},
        sport = ${sport},
        team_name = ${teamName},
        conference = ${conference},
        shared_network_enabled = ${sharedNetworkEnabled},
        network_tier = ${networkTier},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, subdomain, name, display_name, status, branding, features,
                marketplace_type, sport, team_name, conference,
                shared_network_enabled, network_tier, updated_at
    `;

    return NextResponse.json({
      tenant: {
        id: updated.id,
        subdomain: updated.subdomain,
        name: updated.name,
        displayName: updated.display_name,
        status: updated.status,
        branding: updated.branding,
        features: updated.features,
        marketplaceType: updated.marketplace_type,
        sport: updated.sport,
        teamName: updated.team_name,
        conference: updated.conference,
        sharedNetworkEnabled: updated.shared_network_enabled,
        networkTier: updated.network_tier,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const [updated] = await sql`
      UPDATE tenants
      SET status = 'suspended', updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status
    `;

    if (!updated) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    console.error('Suspend tenant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
