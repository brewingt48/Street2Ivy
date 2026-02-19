/**
 * GET /api/education/reports/:id — Get a single issue report
 * PATCH /api/education/reports/:id — Update report status/resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  resolutionNotes: z.string().max(5000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const reports = await sql`
      SELECT id, reporter_id, reporter_name, reported_entity_id, reported_entity_name,
             application_id, category, subject, description, status,
             resolution_notes, resolved_at, resolved_by,
             tenant_id, institution_domain, created_at
      FROM issue_reports
      WHERE id = ${params.id}
        AND institution_domain = ${institutionDomain}
    `;

    if (reports.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const r = reports[0];

    return NextResponse.json({
      report: {
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
      },
    });
  } catch (error) {
    console.error('Education report detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get admin's institution_domain
    const admins = await sql`
      SELECT institution_domain FROM users WHERE id = ${session.data.userId}
    `;

    if (admins.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const institutionDomain = admins[0].institution_domain;

    // Verify report belongs to admin's institution
    const reports = await sql`
      SELECT id, reporter_id, status FROM issue_reports
      WHERE id = ${params.id}
        AND institution_domain = ${institutionDomain}
    `;

    if (reports.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = reports[0];
    const newStatus = data.status || report.status;
    const isResolving = newStatus === 'resolved' && report.status !== 'resolved';

    // Update the report
    let result;
    if (isResolving) {
      result = await sql`
        UPDATE issue_reports
        SET status = ${newStatus},
            resolution_notes = ${data.resolutionNotes || null},
            resolved_at = NOW(),
            resolved_by = ${session.data.userId}
        WHERE id = ${params.id}
        RETURNING id, status, resolved_at
      `;
    } else {
      result = await sql`
        UPDATE issue_reports
        SET status = ${newStatus},
            resolution_notes = COALESCE(${data.resolutionNotes || null}, resolution_notes)
        WHERE id = ${params.id}
        RETURNING id, status
      `;
    }

    // Create notification to the reporter about the status update
    await sql`
      INSERT INTO notifications (recipient_id, type, subject, content, data)
      VALUES (
        ${report.reporter_id},
        'issue_updated',
        'Issue Report Updated',
        ${'Your issue report has been updated to ' + newStatus},
        ${JSON.stringify({ reportId: params.id, status: newStatus })}::jsonb
      )
    `;

    return NextResponse.json({ report: result[0] });
  } catch (error) {
    console.error('Education report update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
