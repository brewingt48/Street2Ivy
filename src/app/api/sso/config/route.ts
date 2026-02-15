/**
 * GET /api/sso/config
 *
 * Returns the SSO configuration for the current tenant.
 * STUB: Returns 501 until SSO is implemented.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Single sign-on is not yet available',
      code: 'SSO_NOT_IMPLEMENTED',
      message: 'SSO support is planned for a future release. SAML 2.0 and OAuth 2.0/OIDC providers (Google Workspace, Microsoft Entra ID, Okta) will be supported.',
    },
    { status: 501 }
  );
}
