/**
 * GET /api/sso/oidc/callback
 *
 * OIDC callback endpoint.
 * Handles the authorization code exchange after IdP authentication.
 *
 * Flow:
 *  1. Reads code_verifier and state from cookies
 *  2. Exchanges authorization code for tokens using PKCE
 *  3. Extracts user info from ID token or userinfo endpoint
 *  4. JIT provisions user if needed
 *  5. Creates session and redirects to dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import {
  getTenantSSOConfigBySubdomain,
  handleOIDCCallback,
  findOrCreateSSOUser,
} from '@/lib/auth/sso';
import { createSession } from '@/lib/auth/session';
import { generateSessionId, setSessionCookie } from '@/lib/auth/cookies';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';
import type { SessionData } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();

  try {
    const { ip, userAgent } = extractRequestInfo(request);
    const url = new URL(request.url);

    // Check for error from IdP
    const error = url.searchParams.get('error');
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || error;
      console.error('OIDC IdP error:', error, errorDescription);

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_failed');
      loginUrl.searchParams.set('error_description', errorDescription);
      return NextResponse.redirect(loginUrl);
    }

    // Read PKCE and state cookies
    const codeVerifier = cookieStore.get('oidc_code_verifier')?.value;
    const expectedState = cookieStore.get('oidc_state')?.value;
    const tenant = cookieStore.get('oidc_tenant')?.value;

    // Clear OIDC cookies
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_state');
    cookieStore.delete('oidc_tenant');

    if (!codeVerifier || !expectedState || !tenant) {
      return NextResponse.json(
        { error: 'Missing OIDC session data. Please try logging in again.' },
        { status: 400 }
      );
    }

    // Validate state parameter
    const state = url.searchParams.get('state');
    if (state !== expectedState) {
      return NextResponse.json(
        { error: 'Invalid state parameter. Possible CSRF attack.' },
        { status: 403 }
      );
    }

    const config = await getTenantSSOConfigBySubdomain(tenant);
    if (!config || !config.isEnabled || config.protocol !== 'oidc') {
      return NextResponse.json(
        { error: 'OIDC SSO is not configured for this tenant' },
        { status: 400 }
      );
    }

    // Exchange code for tokens and extract user info
    const attributes = await handleOIDCCallback(
      config,
      request.url,
      codeVerifier,
      expectedState
    );

    // Get tenant ID from subdomain
    const tenantResult = await sql`
      SELECT id FROM tenants WHERE subdomain = ${tenant} LIMIT 1
    `;
    if (tenantResult.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    const tenantId = tenantResult[0].id;

    // JIT provision or find existing user
    if (!config.jitProvisioning) {
      const existingUser = await sql`
        SELECT id FROM users
        WHERE email = ${attributes.email.toLowerCase().trim()} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (existingUser.length === 0) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'not_provisioned');
        return NextResponse.redirect(loginUrl);
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
      path: '/api/sso/oidc/callback',
      details: {
        method: 'oidc',
        idpName: config.idpName,
        isNewUser: user.isNew,
        tenantId,
      },
    });

    // Redirect to appropriate dashboard
    const dashboardRoutes: Record<string, string> = {
      admin: '/admin',
      student: '/dashboard',
      corporate_partner: '/corporate',
      educational_admin: '/education',
    };

    const redirectTo = dashboardRoutes[user.role] || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('OIDC callback error:', error);

    // Clear cookies on error
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_state');
    cookieStore.delete('oidc_tenant');

    const { ip, userAgent } = extractRequestInfo(request);
    await auditLog('AUTH_FAILURE', {
      ip,
      userAgent,
      path: '/api/sso/oidc/callback',
      details: {
        method: 'oidc',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_failed');
    return NextResponse.redirect(loginUrl);
  }
}
