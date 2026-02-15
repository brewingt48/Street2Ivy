/**
 * POST /api/mfa/verify
 *
 * Verify an MFA code during login or sensitive operations.
 * STUB: Returns 501 until MFA is implemented.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Multi-factor authentication verification is not yet available',
      code: 'MFA_NOT_IMPLEMENTED',
      message: 'MFA verification will accept TOTP codes and SMS codes.',
    },
    { status: 501 }
  );
}
