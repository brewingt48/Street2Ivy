/**
 * Portfolio Projects API
 * PUT — Update portfolio project selections
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getPortfolio, updatePortfolioProjects } from '@/lib/portfolio';

const projectSchema = z.array(z.object({
  listingId: z.string().uuid(),
  displayOrder: z.number().int().min(0),
  isFeatured: z.boolean().default(false),
  studentReflection: z.string().max(1000).optional(),
}));

export async function PUT(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const portfolio = await getPortfolio(session.data.userId);
    if (!portfolio) {
      return NextResponse.json({ error: 'No portfolio found. Create one first.' }, { status: 404 });
    }

    const body = await request.json();
    const projects = projectSchema.parse(body.projects || body);
    await updatePortfolioProjects(portfolio.id, projects);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Portfolio projects PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
