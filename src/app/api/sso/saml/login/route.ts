/**
 * GET /api/sso/saml/login
 *
 * Initiates SAML 2.0 SSO login flow.
 * Redirects the user to the IdP's SSO login URL.
 *
 * Query params:
 *   - tenant: subdomain of the tenant (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantSSOConfigBySubdomain, initiateSAMLLogin } from '@/lib/auth/sso';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');
    const { ip, userAgent } = extractRequestInfo(request);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    const config = await getTenantSSOConfigBySubdomain(tenant);

    if (!config || !config.isEnabled || config.protocol !== 'saml') {
      return NextResponse.json(
        { error: 'SAML SSO is not configured or enabled for this tenant' },
        { status: 404 }
      );
    }

    // Generate SAML AuthnRequest and redirect URL
    const redirectUrl = await initiateSAMLLogin(config);

    // Audit log
    await auditLog('ADMIN_ACTION', {
      ip,
      userAgent,
      path: '/api/sso/saml/login',
      details: {
        action: 'saml_login_initiated',
        tenant,
        idpName: config.idpName,
      },
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('SAML login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate SAML login' },
      { status: 500 }
    );
  }
}
