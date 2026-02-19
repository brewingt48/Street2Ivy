/**
 * PUT /api/admin/users/:id/status — Approve, reject, or discontinue a user
 *
 * Works for both platform admins and edu admins (tenant-scoped).
 * Primarily for corporate partner approval but works on any user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const statusSchema = z.object({
  action: z.enum(['approve', 'reject', 'discontinue', 'reactivate']),
  reason: z.string().max(500).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Allow platform admins and edu admins
    if (!['admin', 'educational_admin'].includes(session.data.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;

    // Get the target user
    const [targetUser] = await sql`
      SELECT id, role, tenant_id, metadata, is_active
      FROM users WHERE id = ${params.id}
    `;

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Edu admins can only manage users within their tenant
    if (session.data.role === 'educational_admin') {
      if (targetUser.tenant_id !== session.data.tenantId) {
        return NextResponse.json({ error: 'Cannot manage users outside your institution' }, { status: 403 });
      }
    }

    const currentMetadata = (targetUser.metadata || {}) as Record<string, unknown>;
    let newMetadata: Record<string, unknown>;
    let isActive = targetUser.is_active;

    switch (action) {
      case 'approve':
        newMetadata = {
          ...currentMetadata,
          approvalStatus: 'approved',
          approvedBy: session.data.userId,
          approvedAt: new Date().toISOString(),
          rejectedReason: undefined,
        };
        isActive = true;
        break;

      case 'reject':
        newMetadata = {
          ...currentMetadata,
          approvalStatus: 'rejected',
          rejectedBy: session.data.userId,
          rejectedAt: new Date().toISOString(),
          rejectedReason: reason || 'No reason provided',
        };
        isActive = false;
        break;

      case 'discontinue':
        newMetadata = {
          ...currentMetadata,
          approvalStatus: 'discontinued',
          discontinuedBy: session.data.userId,
          discontinuedAt: new Date().toISOString(),
          discontinuedReason: reason || 'Account discontinued',
        };
        isActive = false;
        break;

      case 'reactivate':
        newMetadata = {
          ...currentMetadata,
          approvalStatus: 'approved',
          reactivatedBy: session.data.userId,
          reactivatedAt: new Date().toISOString(),
        };
        isActive = true;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Clean up undefined keys
    Object.keys(newMetadata).forEach((k) => {
      if (newMetadata[k] === undefined) delete newMetadata[k];
    });

    await sql`
      UPDATE users
      SET metadata = ${JSON.stringify(newMetadata)}::jsonb,
          is_active = ${isActive},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;

    return NextResponse.json({
      success: true,
      user: {
        id: params.id,
        isActive,
        approvalStatus: newMetadata.approvalStatus,
      },
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
