/**
 * POST /api/sso/saml/callback
 *
 * SAML 2.0 Assertion Consumer Service (ACS) endpoint.
 * Receives the SAML response from the IdP after authentication.
 *
 * Flow:
 *  1. Validates SAML response signature and assertions
 *  2. Extracts user attributes (email, name)
 *  3. JIT provisions user if needed
 *  4. Creates session via createSession()
 *  5. Redirects to dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  getTenantSSOConfig,
  validateSAMLResponse,
  findOrCreateSSOUser,
} from '@/lib/auth/sso';
import { createSession } from '@/lib/auth/session';
import { generateSessionId, setSessionCookie } from '@/lib/auth/cookies';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';
import type { SessionData } from '@/lib/auth/types';

export async function POST(request: NextRequest) {
  try {
    const { ip, userAgent } = extractRequestInfo(request);

    // Parse the SAML response from the form POST body
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string | null;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'Missing SAMLResponse' },
        { status: 400 }
      );
    }

    // Determine tenant from RelayState or referer
    // RelayState typically contains the tenant subdomain or a return URL
    let tenantId: string | null = null;

    if (relayState) {
      // Try to extract tenant from RelayState
      // Could be a direct tenant ID or a URL with tenant info
      const tenantResult = await sql`
        SELECT id FROM tenants WHERE subdomain = ${relayState} LIMIT 1
      `;
      if (tenantResult.length > 0) {
        tenantId = tenantResult[0].id;
      }
    }

    // If RelayState didn't yield a tenant, try to match via the callback URL
    if (!tenantId) {
      // Find tenants that have SAML configured
      const configResult = await sql`
        SELECT tenant_id FROM tenant_sso_configs
        WHERE protocol = 'saml' AND is_enabled = true
      `;
      if (configResult.length === 1) {
        tenantId = configResult[0].tenant_id;
      } else {
        return NextResponse.json(
          { error: 'Unable to determine tenant for SAML callback' },
          { status: 400 }
        );
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unable to determine tenant for SAML callback' },
        { status: 400 }
      );
    }

    const config = await getTenantSSOConfig(tenantId);
    if (!config || !config.isEnabled || config.protocol !== 'saml') {
      return NextResponse.json(
        { error: 'SAML SSO is not configured for this tenant' },
        { status: 400 }
      );
    }

    // Validate SAML response and extract user attributes
    const attributes = await validateSAMLResponse(config, {
      SAMLResponse: samlResponse,
    });

    // JIT provision or find existing user
    if (!config.jitProvisioning) {
      // Check if user exists when JIT is disabled
      const existingUser = await sql`
        SELECT id FROM users
        WHERE email = ${attributes.email.toLowerCase().trim()} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (existingUser.length === 0) {
        return redirectWithError(
          'Your account has not been provisioned. Please contact your administrator.',
          tenantId
        );
      }
    }

    const user = await findOrCreateSSOUser(
      tenantId,
      attributes.email,
      attributes,
      config.defaultRole
    );

    // Create session
    const sid = generateSessionId();
    const sessionData: SessionData = {
      userId: user.userId,
      email: user.email,
      role: user.role as SessionData['role'],
      tenantId,
      createdAt: Date.now(),
    };

    await createSession(sid, sessionData);
    setSessionCookie(sid);

    // Audit log
    await auditLog('AUTH_SUCCESS', {
      userId: user.userId,
      email: user.email,
      ip,
      userAgent,
      path: '/api/sso/saml/callback',
      details: {
        method: 'saml',
        idpName: config.idpName,
        isNewUser: user.isNew,
        tenantId,
      },
    });

    // Redirect to appropriate dashboard based on role
    const dashboardRoutes: Record<string, string> = {
      admin: '/admin',
      student: '/dashboard',
      corporate_partner: '/corporate',
      educational_admin: '/education',
    };

    const redirectTo = dashboardRoutes[user.role] || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('SAML callback error:', error);

    // Audit failed SSO attempt
    const { ip, userAgent } = extractRequestInfo(request);
    await auditLog('AUTH_FAILURE', {
      ip,
      userAgent,
      path: '/api/sso/saml/callback',
      details: {
        method: 'saml',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // Redirect to login with error
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_failed');
    return NextResponse.redirect(loginUrl);
  }
}

function redirectWithError(message: string, _tenantId: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
