/**
 * GET /api/sso/oidc/login
 *
 * Initiates OIDC SSO login flow with PKCE.
 * Redirects the user to the OIDC authorization endpoint.
 * Stores code_verifier and state in temporary cookies.
 *
 * Query params:
 *   - tenant: subdomain of the tenant (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantSSOConfigBySubdomain, initiateOIDCLogin } from '@/lib/auth/sso';
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

    if (!config || !config.isEnabled || config.protocol !== 'oidc') {
      return NextResponse.json(
        { error: 'OIDC SSO is not configured or enabled for this tenant' },
        { status: 404 }
      );
    }

    // Generate OIDC authorization URL with PKCE
    const { authorizationUrl, codeVerifier, state } = await initiateOIDCLogin(config);

    // Store code_verifier and state in secure cookies for callback validation
    const cookieStore = cookies();

    cookieStore.set('oidc_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    cookieStore.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    cookieStore.set('oidc_tenant', tenant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    // Audit log
    await auditLog('ADMIN_ACTION', {
      ip,
      userAgent,
      path: '/api/sso/oidc/login',
      details: {
        action: 'oidc_login_initiated',
        tenant,
        idpName: config.idpName,
      },
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('OIDC login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OIDC login' },
      { status: 500 }
    );
  }
}
