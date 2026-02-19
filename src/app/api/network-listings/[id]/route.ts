/**
 * GET /api/network-listings/[id] — Get single network listing detail
 *
 * Includes partner info, required skills, and application count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const listingId = params.id;

    // Get listing with partner info
    const listings = await sql`
      SELECT
        nl.*,
        np.name AS partner_name,
        np.slug AS partner_slug,
        np.type AS partner_type,
        np.industry AS partner_industry,
        np.website AS partner_website,
        np.logo_url AS partner_logo_url,
        np.description AS partner_description,
        np.is_alumni_partner AS partner_is_alumni,
        np.alumni_institution AS partner_alumni_institution,
        np.alumni_sport AS partner_alumni_sport,
        np.headquarters AS partner_headquarters,
        (SELECT COUNT(*) FROM network_applications na WHERE na.network_listing_id = nl.id) AS application_count
      FROM network_listings nl
      JOIN network_partners np ON np.id = nl.network_partner_id
      WHERE nl.id = ${listingId}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const l = listings[0];

    // Get required skills
    const skills = await sql`
      SELECT
        nls.importance,
        nls.min_proficiency,
        s.id AS skill_id,
        s.name AS skill_name,
        s.category AS skill_category
      FROM network_listing_skills nls
      JOIN skills s ON s.id = nls.skill_id
      WHERE nls.network_listing_id = ${listingId}
      ORDER BY
        CASE nls.importance
          WHEN 'required' THEN 1
          WHEN 'preferred' THEN 2
          WHEN 'nice_to_have' THEN 3
        END
    `;

    // Check if current user has already applied
    let hasApplied = false;
    if (session.data.role === 'student') {
      const existingApp = await sql`
        SELECT id FROM network_applications
        WHERE network_listing_id = ${listingId}
          AND student_user_id = ${session.data.userId}
          AND status NOT IN ('withdrawn', 'cancelled')
      `;
      hasApplied = existingApp.length > 0;
    }

    return NextResponse.json({
      listing: {
        id: l.id,
        networkPartnerId: l.network_partner_id,
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
        remoteOk: l.remote_ok,
        location: l.location,
        isAlumniProject: l.is_alumni_project,
        alumniMessage: l.alumni_message,
        isFeatured: l.is_featured,
        publishedAt: l.published_at,
        createdAt: l.created_at,
        applicationCount: Number(l.application_count),
        partner: {
          name: l.partner_name,
          slug: l.partner_slug,
          type: l.partner_type,
          industry: l.partner_industry,
          website: l.partner_website,
          logoUrl: l.partner_logo_url,
          description: l.partner_description,
          isAlumni: l.partner_is_alumni,
          alumniInstitution: l.partner_alumni_institution,
          alumniSport: l.partner_alumni_sport,
          headquarters: l.partner_headquarters,
        },
        skills: skills.map((s: Record<string, unknown>) => ({
          id: s.skill_id,
          name: s.skill_name,
          category: s.skill_category,
          importance: s.importance,
          minProficiency: s.min_proficiency,
        })),
      },
      hasApplied,
    });
  } catch (error) {
    console.error('Network listing detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
