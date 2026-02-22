/**
 * Handshake Integration Status API
 * GET — Check integration status for current institution
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const rows = await sql`
      SELECT id, is_active, last_sync_at, last_sync_status, last_sync_error,
             sync_frequency, data_permissions, api_base_url, created_at
      FROM handshake_integrations
      WHERE institution_id = ${session.data.tenantId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const integration = rows[0];
    return NextResponse.json({
      connected: true,
      isActive: integration.is_active,
      lastSyncAt: integration.last_sync_at,
      lastSyncStatus: integration.last_sync_status,
      lastSyncError: integration.last_sync_error,
      syncFrequency: integration.sync_frequency,
      dataPermissions: integration.data_permissions,
      apiBaseUrl: integration.api_base_url,
      createdAt: integration.created_at,
    });
  } catch (error) {
    console.error('Handshake status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
