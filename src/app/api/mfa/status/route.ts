/**
 * GET /api/mfa/status
 *
 * Returns the MFA enrollment status for the current user.
 * STUB: Returns 501 until MFA is implemented.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Multi-factor authentication is not yet available',
      code: 'MFA_NOT_IMPLEMENTED',
      message: 'MFA support is planned for a future release. TOTP (authenticator app) and SMS-based verification will be supported.',
    },
    { status: 501 }
  );
}
