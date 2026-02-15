/**
 * POST /api/ai/match-insights — Generate AI match insights for a student-project match
 *
 * Compares student skills against listing requirements, then calls Claude
 * to produce a structured match assessment with strengths, gaps, interview tips,
 * and a confidence score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';

const matchInsightsSchema = z.object({
  listingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Match insights are available to students only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = matchInsightsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { listingId } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching', 'match_insights');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Fetch the listing
    const listingRows = await sql`
      SELECT l.id, l.title, l.description, l.skills_required,
             u.company_name
      FROM listings l
      LEFT JOIN users u ON u.id = l.author_id
      WHERE l.id = ${listingId}
    `;

    if (listingRows.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = listingRows[0];
    const requiredSkills: string[] = ((listing.skills_required as string[]) || []).map(
      (s) => (typeof s === 'string' ? s : '')
    );

    // Step 3: Fetch student profile
    const userRows = await sql`
      SELECT first_name, last_name, university, major, graduation_year, gpa, bio
      FROM users
      WHERE id = ${userId}
    `;

    const user = userRows[0] || {};

    // Step 4: Fetch student skills
    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${userId}
    `;

    const studentSkills: string[] = skillRows.map(
      (s: Record<string, unknown>) => s.name as string
    );

    // Step 5: Compare skills
    const requiredLower = requiredSkills.map((s) => s.toLowerCase());
    const studentLower = studentSkills.map((s) => s.toLowerCase());

    const matchedSkills = requiredSkills.filter((s) =>
      studentLower.includes(s.toLowerCase())
    );
    const missingSkills = requiredSkills.filter(
      (s) => !studentLower.includes(s.toLowerCase())
    );

    // Step 6: Build prompt and call Claude
    const systemPrompt = [
      `You are a career match analyst for Campus2Career. Analyze how well a student matches a project listing and provide structured insights.`,
      ``,
      `## Listing Details`,
      `- Title: ${listing.title as string}`,
      `- Company: ${(listing.company_name as string) || 'Not specified'}`,
      `- Description: ${(listing.description as string) || 'No description'}`,
      `- Required Skills: ${requiredSkills.join(', ') || 'None specified'}`,
      ``,
      `## Student Profile`,
      `- Name: ${(user.first_name as string) || ''} ${(user.last_name as string) || ''}`.trim(),
      `- University: ${(user.university as string) || 'Not specified'}`,
      `- Major: ${(user.major as string) || 'Not specified'}`,
      `- Graduation Year: ${(user.graduation_year as string) || 'Not specified'}`,
      `- GPA: ${(user.gpa as string) || 'Not specified'}`,
      `- Bio: ${(user.bio as string) || 'Not provided'}`,
      `- Skills: ${studentSkills.join(', ') || 'None listed'}`,
      ``,
      `## Skill Comparison`,
      `- Matched Skills: ${matchedSkills.join(', ') || 'None'}`,
      `- Missing Skills: ${missingSkills.join(', ') || 'None'}`,
      ``,
      `## Instructions`,
      `Analyze the match and return a JSON object with the following fields:`,
      `- "match_assessment": A 2-3 sentence assessment of the student's fit for this project`,
      `- "strengths": An array of 3-5 specific strengths the student brings to this project`,
      `- "gaps": An array of skill gaps or areas the student should develop (can be empty if perfect match)`,
      `- "interview_tips": An array of 3-5 specific interview tips tailored to this listing and the student's profile`,
      `- "confidence_score": A number from 0-100 representing how confident the match is`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ].join('\n');

    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Please analyze this student-project match and provide insights.',
        },
      ],
      maxTokens: 2048,
    });

    // Step 7: Parse JSON response
    let insights;
    try {
      const parsed = JSON.parse(aiResponse);
      insights = {
        matchAssessment: parsed.match_assessment as string,
        strengths: parsed.strengths as string[],
        gaps: parsed.gaps as string[],
        interviewTips: parsed.interview_tips as string[],
        confidenceScore: parsed.confidence_score as number,
      };
    } catch {
      console.error('Failed to parse AI match insights response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 8: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'student_coaching');
    const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');

    return NextResponse.json({ insights, usage });
  } catch (error) {
    console.error('AI match insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
