/**
 * POST /api/sso/initiate/[provider]
 *
 * Legacy SSO initiation stub — redirects to protocol-specific login endpoints.
 * Use /api/sso/saml/login or /api/sso/oidc/login instead.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  return NextResponse.json(
    {
      error: 'Use protocol-specific login endpoints instead',
      saml: '/api/sso/saml/login?tenant={subdomain}',
      oidc: '/api/sso/oidc/login?tenant={subdomain}',
      requestedProvider: params.provider,
    },
    { status: 400 }
  );
}
