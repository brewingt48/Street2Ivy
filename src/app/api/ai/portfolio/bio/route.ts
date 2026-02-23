/**
 * POST /api/ai/portfolio/bio — Improve a student's portfolio bio using AI
 *
 * Takes the student's current bio, loads their profile context (skills, projects,
 * ratings), and returns an AI-polished version preserving their voice.
 *
 * Uses the student_coaching feature key (same rate limits as AI coaching).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { buildBioImprovementPrompt } from '@/lib/ai/prompts';
import type { StudentProfileForAi } from '@/lib/ai/types';

const bioSchema = z.object({
  currentBio: z.string().min(20, 'Bio must be at least 20 characters to improve').max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Bio improvement is available to students only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentBio } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'AI access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Load student profile
    const userRows = await sql`
      SELECT display_name, university, major, graduation_year, gpa, bio, metadata
      FROM users WHERE id = ${userId}
    `;
    const user = userRows[0] || {};
    const metadata = (user.metadata || {}) as Record<string, unknown>;

    // Load skills
    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${userId}
    `;

    // Load completed project titles
    const projectRows = await sql`
      SELECT pl.title
      FROM project_applications pa
      JOIN project_listings pl ON pl.id = pa.listing_id
      WHERE pa.student_id = ${userId} AND pa.status = 'completed'
    `;

    // Load average rating
    const ratingRows = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg_rating
      FROM corporate_ratings
      WHERE student_id = ${userId}
    `;

    const studentProfile: StudentProfileForAi = {
      name: (user.display_name as string) || 'Student',
      university: (user.university as string) || null,
      major: (user.major as string) || null,
      graduationYear: (user.graduation_year as string) || null,
      gpa: (user.gpa as string) || null,
      bio: currentBio,
      skills: skillRows.map((s: Record<string, unknown>) => s.name as string),
      sportsPlayed: (metadata.sportsPlayed as string) || null,
      activities: (metadata.activities as string) || null,
    };

    const completedProjects = projectRows.map((p: Record<string, unknown>) => p.title as string);
    const avgRating = ratingRows[0]?.avg_rating ? parseFloat(ratingRows[0].avg_rating as string) : null;

    // Build prompt and call Claude
    const systemPrompt = buildBioImprovementPrompt(studentProfile, currentBio, completedProjects, avgRating);

    const improvedBio = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [{ role: 'user', content: 'Please improve my bio.' }],
      maxTokens: 1024,
    });

    // Increment usage
    await incrementUsageV2(tenantId, userId, 'student_coaching');

    // Return result with usage info
    const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');

    return NextResponse.json({ improvedBio: improvedBio.trim(), usage });
  } catch (error) {
    console.error('AI bio improvement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
