/**
 * GET /api/education/issue-reports — List issue reports for the admin's institution
 *
 * Supports ?status=open|investigating|resolved filter.
 * Returns issue reports from the issue_reports table (not outcome_reports).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let reports;
    if (statusFilter) {
      reports = await sql`
        SELECT id, reporter_id, reporter_name, reported_entity_id, reported_entity_name,
               application_id, category, subject, description, status,
               resolution_notes, resolved_at, resolved_by,
               tenant_id, institution_domain, created_at
        FROM issue_reports
        WHERE tenant_id = ${tenantId}
          AND status = ${statusFilter}
        ORDER BY created_at DESC
      `;
    } else {
      reports = await sql`
        SELECT id, reporter_id, reporter_name, reported_entity_id, reported_entity_name,
               application_id, category, subject, description, status,
               resolution_notes, resolved_at, resolved_by,
               tenant_id, institution_domain, created_at
        FROM issue_reports
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({
      reports: reports.map((r: Record<string, unknown>) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterName: r.reporter_name,
        reportedEntityId: r.reported_entity_id,
        reportedEntityName: r.reported_entity_name,
        applicationId: r.application_id,
        category: r.category,
        subject: r.subject,
        description: r.description,
        status: r.status,
        resolutionNotes: r.resolution_notes,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
        createdAt: r.created_at,
      })),
      total: reports.length,
    });
  } catch (error) {
    console.error('List issue reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
