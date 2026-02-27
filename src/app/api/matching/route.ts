/**
 * GET /api/matching?type=projects — Get recommended projects for current student
 * GET /api/matching?type=students&listingId=xxx — Get recommended students for a listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { getRecommendedProjects, getRecommendedStudents } from '@/lib/matching/engine';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'projects';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (type === 'projects') {
      if (session.data.role !== 'student') {
        return NextResponse.json({ error: 'Only students can get project recommendations' }, { status: 403 });
      }

      const recommendations = await getRecommendedProjects(session.data.userId, limit);
      return NextResponse.json({ recommendations });
    }

    if (type === 'students') {
      if (session.data.role !== 'corporate_partner' && session.data.role !== 'admin') {
        return NextResponse.json({ error: 'Only corporate partners can get student recommendations' }, { status: 403 });
      }

      const listingId = searchParams.get('listingId');
      if (!listingId) {
        return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
      }

      const scope = (searchParams.get('scope') as 'tenant' | 'network' | undefined) || undefined;
      const recommendations = await getRecommendedStudents(listingId, limit, scope);
      return NextResponse.json({ recommendations });
    }

    return NextResponse.json({ error: 'Invalid type. Use "projects" or "students"' }, { status: 400 });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
