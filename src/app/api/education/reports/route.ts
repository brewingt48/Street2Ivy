/**
 * GET /api/education/reports — List issue reports for education admin's institution
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get admin's institution_domain
    const admins = await sql`
      SELECT institution_domain FROM users WHERE id = ${session.data.userId}
    `;

    if (admins.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const institutionDomain = admins[0].institution_domain;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = 20;
    const offset = (page - 1) * perPage;

    let reports;
    let countResult;

    if (status) {
      reports = await sql`
        SELECT id, reporter_id, reporter_name, reported_entity_id, reported_entity_name,
               application_id, category, subject, description, status,
               resolution_notes, resolved_at, resolved_by,
               tenant_id, institution_domain, created_at
        FROM issue_reports
        WHERE institution_domain = ${institutionDomain}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as count FROM issue_reports
        WHERE institution_domain = ${institutionDomain}
          AND status = ${status}
      `;
    } else {
      reports = await sql`
        SELECT id, reporter_id, reporter_name, reported_entity_id, reported_entity_name,
               application_id, category, subject, description, status,
               resolution_notes, resolved_at, resolved_by,
               tenant_id, institution_domain, created_at
        FROM issue_reports
        WHERE institution_domain = ${institutionDomain}
        ORDER BY created_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as count FROM issue_reports
        WHERE institution_domain = ${institutionDomain}
      `;
    }

    const total = parseInt(countResult[0].count as string);
    const totalPages = Math.ceil(total / perPage);

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
        tenantId: r.tenant_id,
        institutionDomain: r.institution_domain,
        createdAt: r.created_at,
      })),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Education reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
