/**
 * GET /api/sso/info
 *
 * Public endpoint: returns SSO status for a tenant (by subdomain).
 * Used by the login form to determine whether to show SSO button
 * and/or hide password form.
 *
 * Query params:
 *   - tenant: subdomain of the tenant (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');

    if (!tenant) {
      return NextResponse.json({ sso: null });
    }

    // Look up tenant by subdomain
    const tenantResult = await sql`
      SELECT id FROM tenants WHERE subdomain = ${tenant} LIMIT 1
    `;
    if (tenantResult.length === 0) {
      return NextResponse.json({ sso: null });
    }

    const tenantId = tenantResult[0].id;

    // Check for enabled SSO config
    const ssoResult = await sql`
      SELECT protocol, is_enabled, enforce_sso, idp_name
      FROM tenant_sso_configs
      WHERE tenant_id = ${tenantId} AND is_enabled = true
      LIMIT 1
    `;

    if (ssoResult.length === 0) {
      return NextResponse.json({ sso: null });
    }

    const row = ssoResult[0];
    return NextResponse.json({
      sso: {
        protocol: row.protocol,
        enforceSso: row.enforce_sso,
        idpName: row.idp_name || (row.protocol === 'saml' ? 'SAML' : 'OIDC'),
      },
    });
  } catch (error) {
    console.error('SSO info error:', error);
    return NextResponse.json({ sso: null });
  }
}
