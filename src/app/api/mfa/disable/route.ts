/**
 * POST /api/mfa/disable
 *
 * Disable MFA for the current user.
 * Requires both the current password and a valid TOTP code for security.
 * Deletes all encrypted secrets and backup codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { disableMFA, getUserMFARecord, verifyTOTPCode } from '@/lib/auth/mfa';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { ip, userAgent } = extractRequestInfo(request);
    const reqInfo = { ip, userAgent, userId: session.data.userId, email: session.data.email };

    const body = await request.json();
    const { password, code } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'TOTP code is required' },
        { status: 400 }
      );
    }

    // Verify TOTP code first
    const record = await getUserMFARecord(session.data.userId);
    if (!record || !record.isEnabled || !record.totpSecretEncrypted) {
      return NextResponse.json(
        { error: 'MFA is not enabled' },
        { status: 400 }
      );
    }

    const totpValid = verifyTOTPCode(record.totpSecretEncrypted, code);
    if (!totpValid) {
      auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'disable_invalid_totp' } });
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    // Disable MFA (also verifies password)
    const result = await disableMFA(session.data.userId, session.data.email, password);

    if (!result.success) {
      auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'disable_invalid_password' } });
      return NextResponse.json(
        { error: result.error || 'Failed to disable MFA' },
        { status: 400 }
      );
    }

    auditLog('MFA_DISABLED', { ...reqInfo, details: { method: 'totp' } });

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    console.error('MFA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
