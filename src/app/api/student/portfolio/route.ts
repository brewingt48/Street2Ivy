/**
 * Student Portfolio API
 * GET   — Get own portfolio
 * POST  — Create portfolio
 * PATCH — Update portfolio settings
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { createPortfolio, getPortfolio, updatePortfolio } from '@/lib/portfolio';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'portfolioBuilder');
      if (!allowed) {
        return NextResponse.json({ error: 'Portfolio Builder requires Professional plan or higher' }, { status: 403 });
      }
    }

    const portfolio = await getPortfolio(session.data.userId);

    // Check if the student has any completed projects (for empty-state messaging)
    let hasCompletedProjects = false;
    try {
      const rows = await sql`
        SELECT 1 FROM project_applications
        WHERE student_id = ${session.data.userId}
          AND status = 'completed'
        LIMIT 1
      `;
      hasCompletedProjects = rows.length > 0;
    } catch {
      // Non-fatal — default to false
    }

    return NextResponse.json({ portfolio, hasCompletedProjects });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  theme: z.enum(['professional', 'modern', 'minimal', 'bold']).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'portfolioBuilder');
      if (!allowed) {
        return NextResponse.json({ error: 'Portfolio Builder requires Professional plan or higher' }, { status: 403 });
      }
    }

    // Check if already has portfolio
    const existing = await getPortfolio(session.data.userId);
    if (existing) {
      return NextResponse.json({ error: 'Portfolio already exists', portfolio: existing }, { status: 409 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);
    const result = await createPortfolio(session.data.userId, data);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Portfolio POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  theme: z.enum(['professional', 'modern', 'minimal', 'bold']).optional(),
  showSkills: z.boolean().optional(),
  showReadiness: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);
    await updatePortfolio(session.data.userId, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Portfolio PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
