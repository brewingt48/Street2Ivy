/**
 * GET /api/admin/waitlist — List student waitlist entries
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
    const contacted = searchParams.get('contacted');

    let entries;
    if (contacted === 'true') {
      entries = await sql`
        SELECT id, email, first_name, last_name, domain, institution_name,
               attempts, contacted, notes, created_at, last_attempt_at
        FROM student_waitlist WHERE contacted = true
        ORDER BY created_at DESC LIMIT 100
      `;
    } else if (contacted === 'false') {
      entries = await sql`
        SELECT id, email, first_name, last_name, domain, institution_name,
               attempts, contacted, notes, created_at, last_attempt_at
        FROM student_waitlist WHERE contacted = false
        ORDER BY created_at DESC LIMIT 100
      `;
    } else {
      entries = await sql`
        SELECT id, email, first_name, last_name, domain, institution_name,
               attempts, contacted, notes, created_at, last_attempt_at
        FROM student_waitlist
        ORDER BY created_at DESC LIMIT 100
      `;
    }

    return NextResponse.json({
      entries: entries.map((e: Record<string, unknown>) => ({
        id: e.id,
        email: e.email,
        firstName: e.first_name,
        lastName: e.last_name,
        domain: e.domain,
        institutionName: e.institution_name,
        attempts: e.attempts,
        contacted: e.contacted,
        notes: e.notes,
        createdAt: e.created_at,
        lastAttemptAt: e.last_attempt_at,
      })),
    });
  } catch (error) {
    console.error('Admin waitlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
