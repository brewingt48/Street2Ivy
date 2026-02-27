/**
 * POST /api/mfa/verify
 *
 * Verify an MFA code. Serves two purposes:
 *
 * 1. Enrollment verification: If MFA is not yet enabled, this completes
 *    enrollment by verifying the code and enabling MFA. Returns backup codes.
 *    Body: { code: string, secret: string }
 *
 * 2. Login verification: If MFA is already enabled, this verifies the code
 *    during login and marks the session as MFA-verified.
 *    Body: { code: string, isBackupCode?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  enrollMFA,
  getUserMFARecord,
  verifyTOTPCode,
  verifyBackupCode,
  markSessionMFAVerified,
  touchMFAUsage,
} from '@/lib/auth/mfa';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { ip, userAgent } = extractRequestInfo(request);
    const reqInfo = { ip, userAgent, userId: session.data.userId, email: session.data.email };

    const body = await request.json();
    const { code, secret, isBackupCode } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Check current MFA state
    const record = await getUserMFARecord(session.data.userId);

    // Case 1: Enrollment verification (MFA not yet enabled)
    if (!record || !record.isEnabled) {
      if (!secret || typeof secret !== 'string') {
        return NextResponse.json(
          { error: 'Secret is required for enrollment verification' },
          { status: 400 }
        );
      }

      const result = await enrollMFA(session.data.userId, secret, code);

      if (!result.success) {
        auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'enrollment_verification_failed' } });
        return NextResponse.json(
          { error: result.error || 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Mark session as MFA-verified
      await markSessionMFAVerified(session.sid);

      auditLog('MFA_ENROLLED', { ...reqInfo, details: { method: 'totp' } });

      return NextResponse.json({
        success: true,
        backupCodes: result.backupCodes,
        message: 'MFA has been enabled successfully',
      });
    }

    // Case 2: Login verification (MFA already enabled)
    if (isBackupCode) {
      // Verify backup code
      if (!record.backupCodesEncrypted) {
        return NextResponse.json(
          { error: 'No backup codes available' },
          { status: 400 }
        );
      }

      const backupValid = await verifyBackupCode(
        session.data.userId,
        record.backupCodesEncrypted,
        code
      );

      if (!backupValid) {
        auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'invalid_backup_code' } });
        return NextResponse.json(
          { error: 'Invalid backup code' },
          { status: 400 }
        );
      }

      await markSessionMFAVerified(session.sid);
      await touchMFAUsage(session.data.userId);

      auditLog('MFA_BACKUP_USED', { ...reqInfo, details: { method: 'backup_code' } });

      return NextResponse.json({
        success: true,
        message: 'Backup code verified successfully',
      });
    }

    // Verify TOTP code
    if (!record.totpSecretEncrypted) {
      return NextResponse.json(
        { error: 'MFA configuration is incomplete' },
        { status: 400 }
      );
    }

    const isValid = verifyTOTPCode(record.totpSecretEncrypted, code);

    if (!isValid) {
      auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'invalid_totp_code' } });
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    await markSessionMFAVerified(session.sid);
    await touchMFAUsage(session.data.userId);

    auditLog('MFA_VERIFIED', { ...reqInfo, details: { method: 'totp' } });

    return NextResponse.json({
      success: true,
      message: 'MFA verification successful',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    console.error('MFA verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
