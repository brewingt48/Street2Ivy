/**
 * GET /api/education/reports/:id — Get a single outcome report
 * PATCH /api/education/reports/:id — Update report (scheduling, title)
 * DELETE /api/education/reports/:id — Delete a report
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isScheduled: z.boolean().optional(),
  scheduleFrequency: z.enum(['monthly', 'quarterly', 'semester']).nullable().optional(),
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
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'outcomesDashboard');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Outcomes Dashboard requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const reports = await sql`
      SELECT id, institution_id, title, report_type, filters,
             generated_by, generated_at, file_url,
             is_scheduled, schedule_frequency,
             created_at, updated_at
      FROM outcome_reports
      WHERE id = ${params.id}
        AND institution_id = ${tenantId}
    `;

    if (reports.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const r = reports[0];

    // Fetch the generator's display name
    let generatedByName = null;
    if (r.generated_by) {
      const users = await sql`
        SELECT display_name FROM users WHERE id = ${r.generated_by}
      `;
      generatedByName = users[0]?.display_name || null;
    }

    return NextResponse.json({
      report: {
        id: r.id,
        institutionId: r.institution_id,
        title: r.title,
        reportType: r.report_type,
        filters: r.filters,
        generatedBy: r.generated_by,
        generatedByName,
        generatedAt: r.generated_at,
        fileUrl: r.file_url,
        isScheduled: r.is_scheduled,
        scheduleFrequency: r.schedule_frequency,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
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
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'outcomesDashboard');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Outcomes Dashboard requires Professional plan or higher' },
          { status: 403 }
        );
      }
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

    // Verify report belongs to admin's institution
    const existing = await sql`
      SELECT id FROM outcome_reports
      WHERE id = ${params.id}
        AND institution_id = ${tenantId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Build update fields dynamically
    const result = await sql`
      UPDATE outcome_reports
      SET title = COALESCE(${data.title || null}, title),
          is_scheduled = COALESCE(${data.isScheduled ?? null}, is_scheduled),
          schedule_frequency = COALESCE(${data.scheduleFrequency ?? null}, schedule_frequency),
          updated_at = NOW()
      WHERE id = ${params.id}
        AND institution_id = ${tenantId}
      RETURNING id, title, is_scheduled, schedule_frequency, updated_at
    `;

    return NextResponse.json({ report: result[0] });
  } catch (error) {
    console.error('Education report update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'outcomesDashboard');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Outcomes Dashboard requires Professional plan or higher' },
          { status: 403 }
        );
      }
    }

    const result = await sql`
      DELETE FROM outcome_reports
      WHERE id = ${params.id}
        AND institution_id = ${tenantId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Education report delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
