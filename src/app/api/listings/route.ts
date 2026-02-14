/**
 * GET /api/listings — List current user's project listings
 * POST /api/listings — Create a new listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  category: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  remoteAllowed: z.boolean().optional(),
  compensation: z.string().max(200).optional(),
  hoursPerWeek: z.number().int().min(1).max(80).optional(),
  duration: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxApplicants: z.number().int().min(1).max(1000).optional(),
  requiresNda: z.boolean().optional(),
  skillsRequired: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const listings = await sql`
      SELECT
        l.id, l.title, l.description, l.category, l.location,
        l.remote_allowed, l.compensation, l.hours_per_week,
        l.duration, l.start_date, l.end_date, l.max_applicants,
        l.requires_nda, l.skills_required, l.status,
        l.published_at, l.closed_at, l.created_at,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id) as application_count,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id AND pa.status = 'pending') as pending_count
      FROM listings l
      WHERE l.author_id = ${session.data.userId}
      ORDER BY l.created_at DESC
    `;

    return NextResponse.json({
      listings: listings.map((l: Record<string, unknown>) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        category: l.category,
        location: l.location,
        remoteAllowed: l.remote_allowed,
        compensation: l.compensation,
        hoursPerWeek: l.hours_per_week,
        duration: l.duration,
        startDate: l.start_date,
        endDate: l.end_date,
        maxApplicants: l.max_applicants,
        requiresNda: l.requires_nda,
        skillsRequired: l.skills_required,
        status: l.status,
        publishedAt: l.published_at,
        closedAt: l.closed_at,
        createdAt: l.created_at,
        applicationCount: parseInt(l.application_count as string),
        pendingCount: parseInt(l.pending_count as string),
      })),
    });
  } catch (error) {
    console.error('Listings list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Only corporate partners can create listings' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await sql`
      INSERT INTO listings (
        author_id, title, description, category, location,
        remote_allowed, compensation, hours_per_week, duration,
        start_date, end_date, max_applicants, requires_nda,
        skills_required, status
      ) VALUES (
        ${session.data.userId},
        ${data.title},
        ${data.description},
        ${data.category || null},
        ${data.location || null},
        ${data.remoteAllowed || false},
        ${data.compensation || null},
        ${data.hoursPerWeek || null},
        ${data.duration || null},
        ${data.startDate ? new Date(data.startDate).toISOString() : null}::timestamptz,
        ${data.endDate ? new Date(data.endDate).toISOString() : null}::timestamptz,
        ${data.maxApplicants || null},
        ${data.requiresNda || false},
        ${JSON.stringify(data.skillsRequired || [])}::jsonb,
        'draft'
      )
      RETURNING id, title, status, created_at
    `;

    return NextResponse.json({ listing: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Listing create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
