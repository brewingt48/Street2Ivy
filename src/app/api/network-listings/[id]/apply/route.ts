/**
 * POST /api/network-listings/[id]/apply — Student applies to a network listing
 *
 * Validates: student role, listing is open, not already applied, deadline not passed.
 * Calculates match_score using calculate_network_match_score().
 * Inserts into network_applications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  proposedApproach: z.string().max(5000).optional(),
  availabilityNote: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Only students can apply to listings' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const listingId = params.id;

    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check listing exists and is open
    const listings = await sql`
      SELECT id, title, status, application_deadline, max_students, students_accepted
      FROM network_listings
      WHERE id = ${listingId}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = listings[0];

    if (listing.status !== 'open') {
      return NextResponse.json({ error: 'This listing is not currently accepting applications' }, { status: 400 });
    }

    // Check application deadline
    if (listing.application_deadline) {
      const deadline = new Date(listing.application_deadline as string);
      if (deadline < new Date()) {
        return NextResponse.json({ error: 'The application deadline has passed' }, { status: 400 });
      }
    }

    // Check max students not reached
    if (listing.max_students && (listing.students_accepted as number) >= (listing.max_students as number)) {
      return NextResponse.json({ error: 'This listing has already accepted the maximum number of students' }, { status: 400 });
    }

    // Check if already applied
    const existing = await sql`
      SELECT id FROM network_applications
      WHERE network_listing_id = ${listingId}
        AND student_user_id = ${session.data.userId}
        AND status NOT IN ('withdrawn', 'cancelled')
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'You have already applied to this listing' }, { status: 409 });
    }

    // Calculate match score using the SQL function
    const matchResult = await sql`
      SELECT calculate_network_match_score(${session.data.userId}, ${listingId}) AS score
    `;
    const matchScore = matchResult[0]?.score ?? null;

    // Insert application
    const result = await sql`
      INSERT INTO network_applications (
        tenant_id, network_listing_id, student_user_id,
        status, cover_letter, proposed_approach, availability_note,
        match_score
      ) VALUES (
        ${tenantId}, ${listingId}, ${session.data.userId},
        'pending', ${data.coverLetter || null}, ${data.proposedApproach || null},
        ${data.availabilityNote || null}, ${matchScore}
      )
      RETURNING id, status, match_score, created_at
    `;

    const application = result[0];

    return NextResponse.json(
      {
        application: {
          id: application.id,
          status: application.status,
          matchScore: application.match_score,
          createdAt: application.created_at,
          listingTitle: listing.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Network listing apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
