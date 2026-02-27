/**
 * Education Outcome Reports API
 *
 * GET  /api/education/reports — List saved outcome reports for institution
 * POST /api/education/reports — Generate a new outcome report
 *
 * Requires educational_admin role + outcomesDashboard feature.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { computeAllMetrics } from '@/lib/outcomes';
import { z } from 'zod';

const reportSchema = z.object({
  title: z.string().min(1).max(200),
  reportType: z.enum(['engagement', 'skills', 'employer', 'comprehensive']),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  format: z.enum(['csv', 'json']).default('json'),
});

/**
 * GET — List saved outcome reports for the institution
 */
export async function GET() {
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
      SELECT * FROM outcome_reports
      WHERE institution_id = ${tenantId}
      ORDER BY generated_at DESC
    `;

    return NextResponse.json({
      reports: reports.map((r: Record<string, unknown>) => ({
        id: r.id,
        institutionId: r.institution_id,
        title: r.title,
        reportType: r.report_type,
        filters: r.filters,
        generatedBy: r.generated_by,
        generatedAt: r.generated_at,
        fileUrl: r.file_url,
        isScheduled: r.is_scheduled,
        scheduleFrequency: r.schedule_frequency,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('List outcome reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST — Generate a new outcome report
 */
export async function POST(request: Request) {
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
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, reportType, format } = parsed.data;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const periodStart = parsed.data.periodStart || ninetyDaysAgo.toISOString().split('T')[0];
    const periodEnd = parsed.data.periodEnd || now.toISOString().split('T')[0];

    // Compute metrics
    const metricsSummary = await computeAllMetrics(tenantId!, periodStart, periodEnd);

    // Save report metadata
    const filters = {
      reportType,
      dateRange: { start: periodStart, end: periodEnd },
      format,
    };

    await sql`
      INSERT INTO outcome_reports (institution_id, title, report_type, filters, generated_by)
      VALUES (${tenantId}, ${title}, ${reportType}, ${JSON.stringify(filters)}::jsonb, ${session.data.userId})
    `;

    if (format === 'csv') {
      // Format key metrics as CSV rows
      const csvRows: string[] = ['metric_type,value,period_start,period_end'];

      for (const [metricType, metricData] of Object.entries(metricsSummary.metrics)) {
        csvRows.push(
          `${metricType},${metricData.value},${periodStart},${periodEnd}`
        );
      }

      const csvContent = csvRows.join('\n');

      return NextResponse.json({
        format: 'csv',
        title,
        reportType,
        periodStart,
        periodEnd,
        data: csvContent,
      });
    }

    // JSON format — return the MetricsSummary directly
    return NextResponse.json({
      format: 'json',
      title,
      reportType,
      ...metricsSummary,
    });
  } catch (error) {
    console.error('Generate outcome report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
