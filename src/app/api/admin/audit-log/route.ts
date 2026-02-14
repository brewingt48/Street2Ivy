/**
 * GET /api/admin/audit-log — View audit log entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 50;
    const offset = (page - 1) * limit;

    const entries = await sql`
      SELECT al.id, al.user_id, al.action, al.resource, al.resource_id,
             al.details, al.ip_address, al.created_at,
             u.display_name as user_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await sql`SELECT COUNT(*) as count FROM audit_log`;

    return NextResponse.json({
      entries: entries.map((e: Record<string, unknown>) => ({
        id: e.id,
        userId: e.user_id,
        userName: e.user_name,
        action: e.action,
        resource: e.resource,
        resourceId: e.resource_id,
        details: e.details,
        ipAddress: e.ip_address,
        createdAt: e.created_at,
      })),
      total: parseInt(total[0].count as string),
      page,
      totalPages: Math.ceil(parseInt(total[0].count as string) / limit),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
