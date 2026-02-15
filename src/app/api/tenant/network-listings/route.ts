/**
 * GET /api/tenant/network-listings — Browse shared network listings visible to this tenant
 *
 * Returns project listings from the shared network that are visible to
 * this tenant. Requires shared_network_enabled = true on the tenant.
 * Requires educational_admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    // Check if shared network is enabled
    const [tenant] = await sql`
      SELECT features FROM tenants WHERE id = ${tenantId}
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const features = (tenant.features || {}) as Record<string, unknown>;
    if (!features.sharedNetworkEnabled) {
      return NextResponse.json({ error: 'Shared network is not enabled for this tenant' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get listings from other tenants that have shared_network_enabled
    // and their listings are marked as network-visible
    const listings = await sql`
      SELECT
        pl.id,
        pl.title,
        pl.description,
        pl.status,
        pl.project_type,
        pl.industry,
        pl.skills_required,
        pl.created_at,
        u.first_name || ' ' || u.last_name as poster_name,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain
      FROM project_listings pl
      JOIN users u ON u.id = pl.user_id
      JOIN tenants t ON t.id = pl.tenant_id
      WHERE pl.tenant_id != ${tenantId}
        AND pl.status = 'published'
        AND t.status = 'active'
        AND (t.features->>'sharedNetworkEnabled')::boolean = true
      ORDER BY pl.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql`
      SELECT COUNT(*) as total
      FROM project_listings pl
      JOIN tenants t ON t.id = pl.tenant_id
      WHERE pl.tenant_id != ${tenantId}
        AND pl.status = 'published'
        AND t.status = 'active'
        AND (t.features->>'sharedNetworkEnabled')::boolean = true
    `;

    return NextResponse.json({
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        status: l.status,
        projectType: l.project_type,
        industry: l.industry,
        skillsRequired: l.skills_required,
        createdAt: l.created_at,
        posterName: l.poster_name,
        tenantName: l.tenant_name,
        tenantSubdomain: l.tenant_subdomain,
      })),
      total: Number(countRow?.total || 0),
      page,
      limit,
    });
  } catch (error) {
    console.error('Tenant network listings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
