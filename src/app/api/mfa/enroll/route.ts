/**
 * POST /api/mfa/enroll
 *
 * Begin MFA enrollment for the current user.
 * STUB: Returns 501 until MFA is implemented.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Multi-factor authentication enrollment is not yet available',
      code: 'MFA_NOT_IMPLEMENTED',
      message: 'MFA enrollment will support TOTP (Google Authenticator, Authy) and SMS-based verification.',
    },
    { status: 501 }
  );
}
