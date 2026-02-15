/**
 * GET  /api/partner/listings — List partner's network listings
 * POST /api/partner/listings — Create a new network listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';
import { z } from 'zod';

const createListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  scopeOfWork: z.string().optional(),
  deliverables: z.string().optional(),
  category: z.string().max(100).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  paymentType: z.enum(['fixed', 'hourly', 'stipend', 'unpaid']).optional(),
  isPaid: z.boolean().optional().default(true),
  estimatedHours: z.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  maxStudents: z.number().int().min(1).optional().default(1),
  visibility: z.enum(['network', 'targeted', 'private']).optional().default('network'),
  targetInstitutions: z.array(z.string()).optional(),
  remoteOk: z.boolean().optional().default(false),
  location: z.string().max(255).optional(),
  isAlumniProject: z.boolean().optional().default(false),
  alumniMessage: z.string().optional(),
});

/**
 * Helper: look up the network partner for the current session user.
 */
async function getPartnerUser(email: string) {
  const rows = await sql`
    SELECT npu.id, npu.network_partner_id, npu.role
    FROM network_partner_users npu
    WHERE npu.email = ${email} AND npu.status = 'active'
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    const listings = await sql`
      SELECT
        nl.*,
        (SELECT COUNT(*) FROM network_applications na WHERE na.network_listing_id = nl.id) AS application_count
      FROM network_listings nl
      WHERE nl.network_partner_id = ${partnerUser.network_partner_id}
        ${status ? sql`AND nl.status = ${status}` : sql``}
      ORDER BY nl.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count: totalCount }] = await sql`
      SELECT COUNT(*) AS count
      FROM network_listings nl
      WHERE nl.network_partner_id = ${partnerUser.network_partner_id}
        ${status ? sql`AND nl.status = ${status}` : sql``}
    `;

    return NextResponse.json({
      listings: listings.map((l: Record<string, unknown>) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        category: l.category,
        status: l.status,
        visibility: l.visibility,
        isPaid: l.is_paid,
        budgetMin: l.budget_min,
        budgetMax: l.budget_max,
        paymentType: l.payment_type,
        estimatedHours: l.estimated_hours,
        startDate: l.start_date,
        endDate: l.end_date,
        applicationDeadline: l.application_deadline,
        maxStudents: l.max_students,
        studentsAccepted: l.students_accepted,
        remoteOk: l.remote_ok,
        location: l.location,
        isAlumniProject: l.is_alumni_project,
        applicationCount: Number(l.application_count),
        publishedAt: l.published_at,
        createdAt: l.created_at,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    });
  } catch (error) {
    console.error('Partner listings list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const partnerUser = await getPartnerUser(session.data.email);
    if (!partnerUser) {
      return NextResponse.json({ error: 'Network partner account not found' }, { status: 403 });
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

    const [listing] = await sql`
      INSERT INTO network_listings (
        network_partner_id, created_by,
        title, description, scope_of_work, deliverables, category,
        budget_min, budget_max, payment_type, is_paid,
        estimated_hours, start_date, end_date, application_deadline,
        max_students, visibility, target_institutions,
        remote_ok, location,
        is_alumni_project, alumni_message,
        status
      ) VALUES (
        ${partnerUser.network_partner_id}, ${partnerUser.id},
        ${data.title}, ${data.description || null}, ${data.scopeOfWork || null},
        ${data.deliverables || null}, ${data.category || null},
        ${data.budgetMin ?? null}, ${data.budgetMax ?? null},
        ${data.paymentType || null}, ${data.isPaid},
        ${data.estimatedHours ?? null}, ${data.startDate || null},
        ${data.endDate || null}, ${data.applicationDeadline || null},
        ${data.maxStudents}, ${data.visibility},
        ${data.targetInstitutions && data.targetInstitutions.length > 0 ? data.targetInstitutions : null},
        ${data.remoteOk}, ${data.location || null},
        ${data.isAlumniProject}, ${data.alumniMessage || null},
        'draft'
      )
      RETURNING *
    `;

    return NextResponse.json(
      {
        listing: {
          id: listing.id,
          title: listing.title,
          status: listing.status,
          createdAt: listing.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create partner listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
