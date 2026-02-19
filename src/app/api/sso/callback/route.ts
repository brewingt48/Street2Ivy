/**
 * GET /api/sso/callback
 *
 * Handle the SSO callback from an identity provider.
 * STUB: Returns 501 until SSO is implemented.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'SSO callback handling is not yet available',
      code: 'SSO_NOT_IMPLEMENTED',
      message: 'The SSO callback will validate provider tokens, create/link user accounts, and establish sessions.',
    },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'SSO callback handling is not yet available',
      code: 'SSO_NOT_IMPLEMENTED',
      message: 'The SSO callback will validate provider tokens, create/link user accounts, and establish sessions.',
    },
    { status: 501 }
  );
}
