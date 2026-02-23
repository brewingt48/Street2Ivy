/**
 * POST /api/mfa/enroll
 *
 * Begin MFA enrollment for the current user.
 * Generates a TOTP secret, QR code, and returns them to the client.
 * MFA is NOT enabled yet — user must verify the code via /api/mfa/verify.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { generateTOTPSecret, getUserMFAStatus } from '@/lib/auth/mfa';

export async function POST() {
  try {
    const session = await requireAuth();

    // Check if MFA is already enabled
    const status = await getUserMFAStatus(session.data.userId);
    if (status.isEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 409 }
      );
    }

    // Generate TOTP secret and QR code
    const setup = await generateTOTPSecret(session.data.email);

    return NextResponse.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      secret: setup.secret, // for manual entry
      otpauthUrl: setup.otpauthUrl,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    console.error('MFA enroll error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
