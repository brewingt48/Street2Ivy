/**
 * DELETE /api/listings/:id/delete — Permanently delete a listing
 *
 * Only the listing owner (corporate partner) can delete.
 * Deletes associated applications, messages, and notifications first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function DELETE(
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
      SELECT id, title, status FROM listings
      WHERE id = ${params.id} AND author_id = ${session.data.userId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = existing[0];

    // Delete in correct order to respect foreign key constraints
    // 1. Delete application messages for applications on this listing
    await sql`
      DELETE FROM application_messages
      WHERE application_id IN (
        SELECT id FROM project_applications WHERE listing_id = ${params.id}
      )
    `;

    // 2. Delete notifications referencing this listing or its applications
    await sql`
      DELETE FROM notifications
      WHERE related_id = ${params.id}
        OR related_id IN (
          SELECT id::text FROM project_applications WHERE listing_id = ${params.id}
        )
    `;

    // 3. Delete applications for this listing
    await sql`
      DELETE FROM project_applications WHERE listing_id = ${params.id}
    `;

    // 4. Delete any NDA documents for this listing
    await sql`
      DELETE FROM nda_signature_requests
      WHERE nda_document_id IN (
        SELECT id FROM nda_documents WHERE listing_id = ${params.id}
      )
    `;
    await sql`
      DELETE FROM nda_documents WHERE listing_id = ${params.id}
    `;

    // 5. Delete corporate invites for this listing
    await sql`
      DELETE FROM corporate_invites WHERE listing_id = ${params.id}
    `;

    // 6. Delete the listing itself
    await sql`
      DELETE FROM listings WHERE id = ${params.id} AND author_id = ${session.data.userId}
    `;

    return NextResponse.json({
      success: true,
      message: `Listing "${listing.title}" has been permanently deleted`,
    });
  } catch (error) {
    console.error('Listing delete error:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
