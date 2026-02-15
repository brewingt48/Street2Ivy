/**
 * Academic Calendar API
 * GET  — Get tenant's academic calendar
 * POST — Admin: create/update academic calendar entry
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

const createCalendarSchema = z.object({
  termName: z.string().min(1),
  termType: z.enum(['semester', 'quarter', 'trimester', 'break', 'summer']).default('semester'),
  startDate: z.string(),
  endDate: z.string(),
  isBreak: z.boolean().default(false),
  priorityLevel: z.number().int().min(1).max(5).default(3),
  academicYear: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || session.data.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const calendar = await sql`
      SELECT * FROM academic_calendars
      WHERE tenant_id = ${tenantId}
      ORDER BY start_date
    `;

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error('Failed to get academic calendar:', error);
    return NextResponse.json({ error: 'Failed to get academic calendar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'admin' && session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const body = await request.json();
    const data = createCalendarSchema.parse(body);

    const [entry] = await sql`
      INSERT INTO academic_calendars (
        tenant_id, term_name, term_type, start_date, end_date,
        is_break, priority_level, academic_year, notes
      ) VALUES (
        ${tenantId}, ${data.termName}, ${data.termType},
        ${data.startDate}, ${data.endDate},
        ${data.isBreak}, ${data.priorityLevel},
        ${data.academicYear || null}, ${data.notes || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create calendar entry:', error);
    return NextResponse.json({ error: 'Failed to create calendar entry' }, { status: 500 });
  }
}
