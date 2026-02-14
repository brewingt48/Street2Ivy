/**
 * GET /api/listings/:id — Get listing detail (owner only)
 * PUT /api/listings/:id — Update a listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateListingSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  category: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  remoteAllowed: z.boolean().optional(),
  compensation: z.string().max(200).optional().nullable(),
  hoursPerWeek: z.number().int().min(1).max(80).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  maxApplicants: z.number().int().min(1).max(1000).optional().nullable(),
  requiresNda: z.boolean().optional(),
  skillsRequired: z.array(z.string()).optional(),
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

    const listings = await sql`
      SELECT l.*,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id) as application_count
      FROM listings l
      WHERE l.id = ${params.id} AND l.author_id = ${session.data.userId}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const l = listings[0];

    return NextResponse.json({
      listing: {
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
      },
    });
  } catch (error) {
    console.error('Listing detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify ownership
    const existing = await sql`
      SELECT id, status FROM listings WHERE id = ${params.id} AND author_id = ${session.data.userId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update object — only include fields that were explicitly provided
    const updates: Record<string, unknown> = {};
    const cols: string[] = [];

    if (data.title !== undefined) { updates.title = data.title; cols.push('title'); }
    if (data.description !== undefined) { updates.description = data.description; cols.push('description'); }
    if (data.category !== undefined) { updates.category = data.category; cols.push('category'); }
    if (data.location !== undefined) { updates.location = data.location; cols.push('location'); }
    if (data.remoteAllowed !== undefined) { updates.remote_allowed = data.remoteAllowed; cols.push('remote_allowed'); }
    if (data.compensation !== undefined) { updates.compensation = data.compensation; cols.push('compensation'); }
    if (data.hoursPerWeek !== undefined) { updates.hours_per_week = data.hoursPerWeek; cols.push('hours_per_week'); }
    if (data.duration !== undefined) { updates.duration = data.duration; cols.push('duration'); }
    if (data.maxApplicants !== undefined) { updates.max_applicants = data.maxApplicants; cols.push('max_applicants'); }
    if (data.requiresNda !== undefined) { updates.requires_nda = data.requiresNda; cols.push('requires_nda'); }

    if (cols.length > 0) {
      await sql`
        UPDATE listings
        SET ${sql(updates, ...cols)}, updated_at = NOW()
        WHERE id = ${params.id} AND author_id = ${session.data.userId}
      `;
    }

    // Handle dates separately (need casting)
    if (data.startDate !== undefined) {
      await sql`
        UPDATE listings SET start_date = ${data.startDate ? new Date(data.startDate).toISOString() : null}::timestamptz, updated_at = NOW()
        WHERE id = ${params.id}
      `;
    }
    if (data.endDate !== undefined) {
      await sql`
        UPDATE listings SET end_date = ${data.endDate ? new Date(data.endDate).toISOString() : null}::timestamptz, updated_at = NOW()
        WHERE id = ${params.id}
      `;
    }

    // Handle skills_required separately (JSONB)
    if (data.skillsRequired !== undefined) {
      await sql`
        UPDATE listings SET skills_required = ${JSON.stringify(data.skillsRequired)}::jsonb, updated_at = NOW()
        WHERE id = ${params.id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Listing update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
