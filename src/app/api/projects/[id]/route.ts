/**
 * GET /api/projects/:id — Get a single project listing with details
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const listings = await sql`
      SELECT
        l.*,
        u.id as author_id, u.first_name as author_first_name,
        u.last_name as author_last_name, u.display_name as author_display_name,
        u.avatar_url as author_avatar_url, u.bio as author_bio,
        u.company_name as author_company_name,
        u.job_title as author_job_title,
        u.public_data as author_public_data,
        u.metadata as author_metadata,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id) as application_count
      FROM listings l
      JOIN users u ON u.id = l.author_id
      WHERE l.id = ${id}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const l = listings[0];

    // Get author's corporate rating
    const authorRatings = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rating_count
      FROM corporate_ratings
      WHERE corporate_id = ${l.author_id}
    `;

    // Check if current user has already applied
    let userApplication = null;
    const session = await getCurrentSession();
    if (session) {
      const apps = await sql`
        SELECT id, status, submitted_at
        FROM project_applications
        WHERE student_id = ${session.data.userId} AND listing_id = ${id}
        ORDER BY submitted_at DESC
        LIMIT 1
      `;
      if (apps.length > 0) {
        userApplication = {
          id: apps[0].id,
          status: apps[0].status,
          submittedAt: apps[0].submitted_at,
        };
      }
    }

    return NextResponse.json({
      project: {
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
        createdAt: l.created_at,
        applicationCount: parseInt(l.application_count as string),
        author: (() => {
          const publicData = (l.author_public_data || {}) as Record<string, unknown>;
          const metadata = (l.author_metadata || {}) as Record<string, unknown>;
          return {
            id: l.author_id,
            firstName: l.author_first_name,
            lastName: l.author_last_name,
            displayName: l.author_display_name,
            avatarUrl: l.author_avatar_url,
            bio: l.author_bio,
            jobTitle: l.author_job_title || null,
            companyName: l.author_company_name || null,
            companyWebsite: (publicData.companyWebsite as string) || null,
            companyDescription: (publicData.companyDescription as string) || null,
            companyIndustry: (publicData.companyIndustry as string) || null,
            companySize: (publicData.companySize as string) || null,
            stockSymbol: (publicData.stockSymbol as string) || null,
            isPubliclyTraded: (publicData.isPubliclyTraded as boolean) ?? false,
            alumniOf: (metadata.alumniOf as string) || null,
            sportsPlayed: (metadata.sportsPlayed as string) || null,
          };
        })(),
        authorRating: authorRatings[0]?.avg_rating ? {
          average: Number(authorRatings[0].avg_rating),
          count: Number(authorRatings[0].rating_count),
        } : null,
      },
      userApplication,
    });
  } catch (error) {
    console.error('Project detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
