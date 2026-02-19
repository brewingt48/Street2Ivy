/**
 * POST /api/ai/diff-view — AI-powered resume/bio improvement suggestions
 *
 * Analyzes student content (bio or resume summary) and returns a diff-style
 * list of improvement suggestions with original text, suggested replacement,
 * and reasoning. Optionally tailors suggestions toward a specific listing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';

const diffViewSchema = z.object({
  content: z.string().min(1).max(10000),
  contentType: z.enum(['bio', 'resume_summary']),
  targetListingId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Diff view is available to students only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = diffViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { content, contentType, targetListingId } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching', 'diff_view');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Optionally fetch target listing
    let listingContext = '';
    if (targetListingId) {
      const listingRows = await sql`
        SELECT l.title, l.description, l.skills_required,
               u.company_name
        FROM listings l
        LEFT JOIN users u ON u.id = l.author_id
        WHERE l.id = ${targetListingId}
      `;

      if (listingRows.length > 0) {
        const listing = listingRows[0];
        const skills = ((listing.skills_required as string[]) || []).join(', ');
        listingContext = [
          ``,
          `## Target Listing (tailor suggestions toward this opportunity)`,
          `- Title: ${listing.title as string}`,
          `- Company: ${(listing.company_name as string) || 'Not specified'}`,
          `- Description: ${(listing.description as string) || 'No description'}`,
          `- Required Skills: ${skills || 'None specified'}`,
        ].join('\n');
      }
    }

    // Step 3: Build student profile context
    const userRows = await sql`
      SELECT first_name, last_name, university, major, graduation_year, gpa
      FROM users
      WHERE id = ${userId}
    `;

    const user = userRows[0] || {};

    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${userId}
    `;

    const studentSkills: string[] = skillRows.map(
      (s: Record<string, unknown>) => s.name as string
    );

    const contentLabel = contentType === 'bio' ? 'Bio / Personal Statement' : 'Resume Summary';

    // Step 4: Build prompt and call Claude
    const systemPrompt = [
      `You are a professional writing coach for Proveground. You help students improve their ${contentLabel.toLowerCase()} to be more compelling and professional.`,
      ``,
      `## Student Profile`,
      `- Name: ${(user.first_name as string) || ''} ${(user.last_name as string) || ''}`.trim(),
      `- University: ${(user.university as string) || 'Not specified'}`,
      `- Major: ${(user.major as string) || 'Not specified'}`,
      `- Graduation Year: ${(user.graduation_year as string) || 'Not specified'}`,
      `- GPA: ${(user.gpa as string) || 'Not specified'}`,
      `- Skills: ${studentSkills.join(', ') || 'None listed'}`,
      listingContext,
      ``,
      `## Student's Current ${contentLabel}`,
      `${content}`,
      ``,
      `## Instructions`,
      `Analyze the student's ${contentLabel.toLowerCase()} and return a JSON array of improvement suggestions.`,
      `Each suggestion should identify a specific phrase or sentence that can be improved.`,
      ``,
      `Return a JSON array where each element has:`,
      `- "original": The exact text from the student's content that should be changed`,
      `- "suggested": The improved version of that text`,
      `- "reason": A brief explanation of why this change improves the content`,
      ``,
      `Provide 3-7 suggestions ordered by impact. Focus on:`,
      `- Stronger action verbs and quantifiable achievements`,
      `- Removing vague or generic language`,
      `- Highlighting relevant skills and experiences`,
      `- Professional tone and clarity`,
      targetListingId ? `- Alignment with the target listing's requirements and keywords` : '',
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ]
      .filter(Boolean)
      .join('\n');

    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please review my ${contentLabel.toLowerCase()} and suggest improvements.`,
        },
      ],
      maxTokens: 2048,
    });

    // Step 5: Parse JSON response
    let suggestions;
    try {
      const parsed = JSON.parse(aiResponse);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected JSON array');
      }
      suggestions = parsed.map((item: Record<string, unknown>) => ({
        original: item.original as string,
        suggested: item.suggested as string,
        reason: item.reason as string,
      }));
    } catch {
      console.error('Failed to parse AI diff view response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 6: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'student_coaching');
    const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');

    return NextResponse.json({ suggestions, usage });
  } catch (error) {
    console.error('AI diff view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
