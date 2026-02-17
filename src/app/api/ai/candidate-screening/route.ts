/**
 * POST /api/ai/candidate-screening — AI-assisted candidate screening for corporate partners
 *
 * Analyzes a specific applicant against a specific listing and returns
 * structured insights: fit assessment, strengths, concerns, interview questions,
 * and a confidence score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';

const candidateScreeningSchema = z.object({
  applicationId: z.string().uuid(),
});

function buildScreeningPrompt(
  listing: Record<string, unknown>,
  student: Record<string, unknown>,
  studentSkills: string[],
  application: Record<string, unknown>,
  matchedSkills: string[],
  missingSkills: string[],
): string {
  return [
    `You are a candidate screening analyst for Proveground, helping corporate partners evaluate applicants for project-based work.`,
    ``,
    `## Listing Details`,
    `- Title: ${listing.title as string}`,
    `- Description: ${(listing.description as string) || 'No description'}`,
    `- Required Skills: ${((listing.skills_required as string[]) || []).join(', ') || 'None specified'}`,
    `- Category: ${(listing.category as string) || 'Not specified'}`,
    `- Compensation: ${(listing.compensation as string) || 'Not specified'}`,
    `- Hours/Week: ${(listing.hours_per_week as string) || 'Not specified'}`,
    `- Remote: ${listing.remote_allowed ? 'Yes' : 'No'}`,
    ``,
    `## Applicant Profile`,
    `- Name: ${(student.first_name as string) || ''} ${(student.last_name as string) || ''}`.trim(),
    `- University: ${(student.university as string) || 'Not specified'}`,
    `- Major: ${(student.major as string) || 'Not specified'}`,
    `- Graduation Year: ${(student.graduation_year as string) || 'Not specified'}`,
    `- GPA: ${(student.gpa as string) || 'Not specified'}`,
    `- Bio: ${(student.bio as string) || 'Not provided'}`,
    `- Skills: ${studentSkills.join(', ') || 'None listed'}`,
    ``,
    `## Application Details`,
    `- Cover Letter: ${(application.cover_letter as string) || 'Not provided'}`,
    `- Interest Reason: ${(application.interest_reason as string) || 'Not provided'}`,
    `- Relevant Coursework: ${(application.relevant_coursework as string) || 'Not provided'}`,
    `- Availability: ${(application.hours_per_week as string) || 'Not specified'} hours/week`,
    ``,
    `## Skill Comparison`,
    `- Matched Skills: ${matchedSkills.join(', ') || 'None'}`,
    `- Missing Skills: ${missingSkills.join(', ') || 'None'}`,
    ``,
    `## Instructions`,
    `Analyze this candidate's fit for the project and return a JSON object with:`,
    `- "fit_assessment": A 2-3 sentence assessment of the applicant's overall fit for this project`,
    `- "strengths": An array of 3-5 specific strengths this applicant brings to this project`,
    `- "concerns": An array of gaps or areas of concern (can be empty if excellent fit)`,
    `- "interview_questions": An array of 3-5 tailored interview questions specific to this applicant-project pairing`,
    `- "confidence_score": A number from 0-100 representing how confident the match is`,
    ``,
    `Return ONLY valid JSON, no markdown.`,
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner') {
      return NextResponse.json({ error: 'Candidate screening is available to corporate partners only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = candidateScreeningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { applicationId } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'candidate_screening');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Fetch application and verify ownership
    const appRows = await sql`
      SELECT pa.id, pa.student_id, pa.listing_id, pa.cover_letter, pa.interest_reason,
             pa.relevant_coursework, pa.hours_per_week, pa.status
      FROM project_applications pa
      JOIN listings l ON l.id = pa.listing_id
      WHERE pa.id = ${applicationId} AND l.author_id = ${userId}
    `;

    if (appRows.length === 0) {
      return NextResponse.json({ error: 'Application not found or access denied' }, { status: 404 });
    }

    const application = appRows[0];

    // Step 3: Fetch listing details
    const listingRows = await sql`
      SELECT id, title, description, skills_required, category, compensation, hours_per_week, remote_allowed
      FROM listings WHERE id = ${application.listing_id as string}
    `;
    const listing = listingRows[0];

    // Step 4: Fetch student profile
    const studentRows = await sql`
      SELECT first_name, last_name, university, major, graduation_year, gpa, bio
      FROM users WHERE id = ${application.student_id as string}
    `;
    const student = studentRows[0] || {};

    // Step 5: Fetch student skills
    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${application.student_id as string}
    `;
    const studentSkills: string[] = skillRows.map((s: Record<string, unknown>) => s.name as string);

    // Step 6: Compare skills
    const requiredSkills: string[] = ((listing.skills_required as string[]) || []).map(
      (s) => (typeof s === 'string' ? s : '')
    );
    const studentLower = studentSkills.map((s) => s.toLowerCase());
    const matchedSkills = requiredSkills.filter((s) => studentLower.includes(s.toLowerCase()));
    const missingSkills = requiredSkills.filter((s) => !studentLower.includes(s.toLowerCase()));

    // Step 7: Build prompt and call Claude
    const systemPrompt = buildScreeningPrompt(listing, student, studentSkills, application, matchedSkills, missingSkills);

    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        { role: 'user', content: 'Please analyze this candidate and provide screening insights.' },
      ],
      maxTokens: 2048,
    });

    // Step 8: Parse response
    let insights;
    try {
      const parsed = JSON.parse(aiResponse);
      insights = {
        fitAssessment: (parsed.fit_assessment || parsed.fitAssessment) as string,
        strengths: (parsed.strengths) as string[],
        concerns: (parsed.concerns) as string[],
        interviewQuestions: (parsed.interview_questions || parsed.interviewQuestions) as string[],
        confidenceScore: (parsed.confidence_score || parsed.confidenceScore) as number,
      };
    } catch {
      console.error('Failed to parse AI candidate screening response:', aiResponse);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Step 9: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'candidate_screening');
    const usage = await getUsageStatusV2(tenantId, userId, 'candidate_screening');

    return NextResponse.json({ insights, usage });
  } catch (error) {
    console.error('AI candidate screening error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
