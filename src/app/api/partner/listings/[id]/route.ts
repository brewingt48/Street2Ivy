/**
 * GET /api/partner/listings/[id] — Get single listing detail (partner view)
 * PUT /api/partner/listings/[id] — Update listing (including status changes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

async function getPartnerUser(email: string) {
  const rows = await sql`
    SELECT npu.id, npu.network_partner_id, npu.role
    FROM network_partner_users npu
    WHERE npu.email = ${email} AND npu.status = 'active'
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const listingId = params.id;

    const listings = await sql`
      SELECT
        nl.*,
        np.name AS partner_name,
        (SELECT COUNT(*) FROM network_applications na WHERE na.network_listing_id = nl.id) AS application_count,
        (SELECT COUNT(*) FROM network_applications na WHERE na.network_listing_id = nl.id AND na.status = 'accepted') AS accepted_count
      FROM network_listings nl
      JOIN network_partners np ON np.id = nl.network_partner_id
      WHERE nl.id = ${listingId}
        AND nl.network_partner_id = ${partnerUser.network_partner_id}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const l = listings[0];

    // Get skills
    const skills = await sql`
      SELECT nls.*, s.name AS skill_name, s.category AS skill_category
      FROM network_listing_skills nls
      JOIN skills s ON s.id = nls.skill_id
      WHERE nls.network_listing_id = ${listingId}
    `;

    return NextResponse.json({
      listing: {
        id: l.id,
        networkPartnerId: l.network_partner_id,
        partnerName: l.partner_name,
        title: l.title,
        description: l.description,
        scopeOfWork: l.scope_of_work,
        deliverables: l.deliverables,
        category: l.category,
        budgetMin: l.budget_min,
        budgetMax: l.budget_max,
        paymentType: l.payment_type,
        isPaid: l.is_paid,
        estimatedHours: l.estimated_hours,
        startDate: l.start_date,
        endDate: l.end_date,
        applicationDeadline: l.application_deadline,
        maxStudents: l.max_students,
        studentsAccepted: l.students_accepted,
        status: l.status,
        visibility: l.visibility,
        targetInstitutions: l.target_institutions,
        remoteOk: l.remote_ok,
        location: l.location,
        isAlumniProject: l.is_alumni_project,
        alumniMessage: l.alumni_message,
        isFeatured: l.is_featured,
        publishedAt: l.published_at,
        createdAt: l.created_at,
        applicationCount: Number(l.application_count),
        acceptedCount: Number(l.accepted_count),
        skills: skills.map((s: Record<string, unknown>) => ({
          id: s.skill_id,
          name: s.skill_name,
          category: s.skill_category,
          importance: s.importance,
          minProficiency: s.min_proficiency,
        })),
      },
    });
  } catch (error) {
    console.error('Partner listing detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateListingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  scopeOfWork: z.string().optional(),
  deliverables: z.string().optional(),
  category: z.string().max(100).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  paymentType: z.enum(['fixed', 'hourly', 'stipend', 'unpaid']).optional(),
  isPaid: z.boolean().optional(),
  estimatedHours: z.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  maxStudents: z.number().int().min(1).optional(),
  visibility: z.enum(['network', 'targeted', 'private']).optional(),
  targetInstitutions: z.array(z.string()).optional(),
  remoteOk: z.boolean().optional(),
  location: z.string().max(255).optional(),
  isAlumniProject: z.boolean().optional(),
  alumniMessage: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed', 'completed', 'cancelled']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const listingId = params.id;

    // Verify ownership
    const existing = await sql`
      SELECT id, status FROM network_listings
      WHERE id = ${listingId} AND network_partner_id = ${partnerUser.network_partner_id}
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

    // Handle status transition: set published_at when publishing
    const publishedAt = data.status === 'open' && existing[0].status === 'draft'
      ? sql`NOW()`
      : sql`published_at`;

    const [updated] = await sql`
      UPDATE network_listings SET
        title = COALESCE(${data.title ?? null}, title),
        description = COALESCE(${data.description ?? null}, description),
        scope_of_work = COALESCE(${data.scopeOfWork ?? null}, scope_of_work),
        deliverables = COALESCE(${data.deliverables ?? null}, deliverables),
        category = COALESCE(${data.category ?? null}, category),
        budget_min = COALESCE(${data.budgetMin ?? null}, budget_min),
        budget_max = COALESCE(${data.budgetMax ?? null}, budget_max),
        payment_type = COALESCE(${data.paymentType ?? null}, payment_type),
        is_paid = COALESCE(${data.isPaid ?? null}, is_paid),
        estimated_hours = COALESCE(${data.estimatedHours ?? null}, estimated_hours),
        start_date = COALESCE(${data.startDate ?? null}, start_date),
        end_date = COALESCE(${data.endDate ?? null}, end_date),
        application_deadline = COALESCE(${data.applicationDeadline ?? null}, application_deadline),
        max_students = COALESCE(${data.maxStudents ?? null}, max_students),
        visibility = COALESCE(${data.visibility ?? null}, visibility),
        target_institutions = COALESCE(${data.targetInstitutions && data.targetInstitutions.length > 0 ? data.targetInstitutions : null}, target_institutions),
        remote_ok = COALESCE(${data.remoteOk ?? null}, remote_ok),
        location = COALESCE(${data.location ?? null}, location),
        is_alumni_project = COALESCE(${data.isAlumniProject ?? null}, is_alumni_project),
        alumni_message = COALESCE(${data.alumniMessage ?? null}, alumni_message),
        status = COALESCE(${data.status ?? null}, status),
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${listingId}
        AND network_partner_id = ${partnerUser.network_partner_id}
      RETURNING id, title, status, updated_at
    `;

    return NextResponse.json({
      listing: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('Update partner listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
