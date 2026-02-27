/**
 * GET /api/admin/ai/activity — Recent AI conversation activity by tenant
 *
 * Returns conversation counts grouped by tenant for the last 30 days.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Conversation counts per tenant in the last 30 days
    const activityRows = await sql`
      SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        COUNT(c.id)::int AS conversation_count,
        MAX(c.created_at) AS last_active
      FROM tenants t
      LEFT JOIN ai_conversations c
        ON c.tenant_id = t.id AND c.created_at >= NOW() - INTERVAL '30 days'
      WHERE t.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY COUNT(c.id) DESC
    `;

    const activity = activityRows.map((row: Record<string, unknown>) => ({
      tenantId: row.tenant_id as string,
      tenantName: row.tenant_name as string,
      conversations: Number(row.conversation_count),
      lastActive: row.last_active ? (row.last_active as string) : null,
    }));

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Admin AI activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
