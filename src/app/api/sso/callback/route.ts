/**
 * GET/POST /api/sso/callback
 *
 * Legacy SSO callback stub — redirects to protocol-specific callbacks.
 * SAML callbacks go to /api/sso/saml/callback
 * OIDC callbacks go to /api/sso/oidc/callback
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Use protocol-specific callback endpoints',
      saml: '/api/sso/saml/callback (POST)',
      oidc: '/api/sso/oidc/callback (GET)',
    },
    { status: 400 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Use protocol-specific callback endpoints',
      saml: '/api/sso/saml/callback (POST)',
      oidc: '/api/sso/oidc/callback (GET)',
    },
    { status: 400 }
  );
}
