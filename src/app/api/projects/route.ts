/**
 * GET /api/projects — Browse/search published project listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const remote = searchParams.get('remote');
    const skill = searchParams.get('skill') || '';
    const alumniOf = searchParams.get('alumniOf') || '';
    const sportsPlayed = searchParams.get('sportsPlayed') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [sql`l.status = 'published'`];

    if (search) {
      conditions.push(sql`(l.title ILIKE ${'%' + search + '%'} OR l.description ILIKE ${'%' + search + '%'})`);
    }

    if (category) {
      conditions.push(sql`l.category = ${category}`);
    }

    if (remote === 'true') {
      conditions.push(sql`l.remote_allowed = true`);
    }

    if (skill) {
      conditions.push(sql`l.skills_required @> ${JSON.stringify([skill])}::jsonb`);
    }

    if (alumniOf) {
      const alumniPattern = `%${alumniOf}%`;
      conditions.push(sql`u.metadata->>'alumniOf' ILIKE ${alumniPattern}`);
    }

    if (sportsPlayed) {
      const sportsPattern = `%${sportsPlayed}%`;
      conditions.push(sql`u.metadata->>'sportsPlayed' ILIKE ${sportsPattern}`);
    }

    const whereClause = conditions.reduce((acc, cond, i) =>
      i === 0 ? cond : sql`${acc} AND ${cond}`
    );

    // Get listings with author info
    const listings = await sql`
      SELECT
        l.id, l.title, l.description, l.category, l.location,
        l.remote_allowed, l.compensation, l.hours_per_week,
        l.duration, l.start_date, l.end_date, l.max_applicants,
        l.requires_nda, l.skills_required, l.published_at, l.created_at,
        u.id as author_id, u.first_name as author_first_name,
        u.last_name as author_last_name, u.display_name as author_display_name,
        u.metadata as author_metadata,
        (SELECT COUNT(*) FROM project_applications pa WHERE pa.listing_id = l.id) as application_count
      FROM listings l
      JOIN users u ON u.id = l.author_id
      WHERE ${whereClause}
      ORDER BY l.published_at DESC NULLS LAST, l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON u.id = l.author_id
      WHERE ${whereClause}
    `;

    const total = parseInt(countResult[0].total);

    // Get available categories for filter
    const categories = await sql`
      SELECT DISTINCT category FROM listings
      WHERE status = 'published' AND category IS NOT NULL
      ORDER BY category
    `;

    return NextResponse.json({
      listings: listings.map((l: Record<string, unknown>) => {
        const authorMeta = (l.author_metadata || {}) as Record<string, unknown>;
        return {
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
          publishedAt: l.published_at,
          createdAt: l.created_at,
          applicationCount: parseInt(l.application_count as string),
          author: {
            id: l.author_id,
            firstName: l.author_first_name,
            lastName: l.author_last_name,
            displayName: l.author_display_name,
            alumniOf: (authorMeta.alumniOf as string) || null,
            sportsPlayed: (authorMeta.sportsPlayed as string) || null,
          },
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categories: categories.map((c: Record<string, unknown>) => c.category as string),
    });
  } catch (error) {
    console.error('Projects list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
