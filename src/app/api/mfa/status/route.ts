/**
 * GET /api/mfa/status
 *
 * Returns the MFA enrollment status for the current authenticated user.
 * Includes whether MFA is enabled, the method, backup codes remaining,
 * and whether MFA is required by the tenant policy.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserMFAStatus, isMFARequired } from '@/lib/auth/mfa';

export async function GET() {
  try {
    const session = await requireAuth();

    const status = await getUserMFAStatus(session.data.userId);
    const tenantMFARequired = await isMFARequired(session.data.tenantId);

    return NextResponse.json({
      isEnabled: status.isEnabled,
      method: status.method,
      backupCodesRemaining: status.backupCodesRemaining,
      isMFARequired: tenantMFARequired,
    });
  } catch (error) {
    // requireAuth throws NextResponse on 401
    if (error instanceof NextResponse) return error;

    console.error('MFA status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
