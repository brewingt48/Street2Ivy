/**
 * POST /api/sso/initiate/[provider]
 *
 * Initiate an SSO login flow with the specified provider.
 * STUB: Returns 501 until SSO is implemented.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  return NextResponse.json(
    {
      error: `SSO with provider "${params.provider}" is not yet available`,
      code: 'SSO_NOT_IMPLEMENTED',
      message: 'SSO initiation will redirect to the provider for authentication. Supported providers: google, microsoft, okta.',
    },
    { status: 501 }
  );
}
