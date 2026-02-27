/**
 * POST /api/mfa/backup-codes
 *
 * Regenerate backup codes for the current user.
 * Requires a valid TOTP code for security.
 * Returns new backup codes (shown to user once).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { regenerateBackupCodes } from '@/lib/auth/mfa';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { ip, userAgent } = extractRequestInfo(request);
    const reqInfo = { ip, userAgent, userId: session.data.userId, email: session.data.email };

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'TOTP code is required' },
        { status: 400 }
      );
    }

    const result = await regenerateBackupCodes(session.data.userId, code);

    if (!result.success) {
      auditLog('MFA_FAILED', { ...reqInfo, details: { reason: 'backup_regen_failed', error: result.error } });
      return NextResponse.json(
        { error: result.error || 'Failed to regenerate backup codes' },
        { status: 400 }
      );
    }

    auditLog('MFA_BACKUP_REGENERATED', { ...reqInfo, details: { method: 'totp' } });

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'Backup codes regenerated. Save these codes in a safe place.',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    console.error('MFA backup codes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
