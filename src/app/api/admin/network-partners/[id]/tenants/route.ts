/**
 * GET /api/admin/network-partners/[id]/tenants — List tenant relationships for a partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

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

    // Verify partner exists
    const [partner] = await sql`
      SELECT id, name, slug FROM network_partners WHERE id = ${id}
    `;
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const tenants = await sql`
      SELECT
        tpa.id,
        tpa.tenant_id,
        tpa.relationship,
        tpa.invited_by,
        tpa.accepted_at,
        tpa.custom_display_name,
        tpa.custom_description,
        tpa.featured_in_tenant,
        tpa.is_active,
        tpa.created_at,
        tpa.updated_at,
        t.name AS tenant_name,
        t.subdomain AS tenant_subdomain,
        t.status AS tenant_status
      FROM tenant_partner_access tpa
      JOIN tenants t ON t.id = tpa.tenant_id
      WHERE tpa.network_partner_id = ${id}
      ORDER BY tpa.created_at DESC
    `;

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        slug: partner.slug,
      },
      tenants: tenants.map((r: Record<string, unknown>) => ({
        id: r.id,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantSubdomain: r.tenant_subdomain,
        tenantStatus: r.tenant_status,
        relationship: r.relationship,
        invitedBy: r.invited_by,
        acceptedAt: r.accepted_at,
        customDisplayName: r.custom_display_name,
        customDescription: r.custom_description,
        featuredInTenant: r.featured_in_tenant,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error('List partner tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
