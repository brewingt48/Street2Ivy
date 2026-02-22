/**
 * POST /api/ai/talent-discovery — AI-assisted talent discovery for corporate partners
 *
 * Given a listing and a set of student profiles, analyzes each student's fit
 * and provides outreach suggestions with talking points.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { safeParseAiJson } from '@/lib/ai/parse-json';

const talentDiscoverySchema = z.object({
  listingId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(10),
});

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  university: string | null;
  major: string | null;
  gpa: string | null;
  bio: string | null;
  skills: string[];
}

function buildDiscoveryPrompt(
  listing: Record<string, unknown>,
  students: StudentProfile[],
): string {
  const studentEntries = students
    .map(
      (s, i) =>
        [
          `### Student ${i + 1}: ${s.firstName} ${s.lastName}`,
          `- University: ${s.university || 'Not specified'}`,
          `- Major: ${s.major || 'Not specified'}`,
          `- GPA: ${s.gpa || 'Not specified'}`,
          `- Bio: ${s.bio || 'Not provided'}`,
          `- Skills: ${s.skills.join(', ') || 'None listed'}`,
        ].join('\n'),
    )
    .join('\n\n');

  return [
    `You are a talent discovery analyst for Proveground, helping corporate partners identify and reach out to the best student talent for their projects.`,
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
    `## Student Profiles`,
    studentEntries,
    ``,
    `## Instructions`,
    `Analyze each student's fit for this project. Return a JSON object with:`,
    `- "discoveries": An array of objects, one per student, each with:`,
    `  - "student_index": The student number (1-based, matching the order above)`,
    `  - "summary": A 1-2 sentence explanation of why this student is a good (or poor) fit`,
    `  - "talking_points": An array of 2-3 specific points the corporate partner could highlight when reaching out to this student`,
    `  - "fit_score": A number from 0-100 representing the overall student-project fit`,
    ``,
    `Order the discoveries array from highest fit_score to lowest.`,
    `Return ONLY valid JSON, no markdown.`,
  ].join('\n');
}

interface DiscoveryItem {
  student_index?: number;
  studentIndex?: number;
  summary: string;
  talking_points?: string[];
  talkingPoints?: string[];
  fit_score?: number;
  fitScore?: number;
}

function parseDiscoveryResponse(
  aiResponse: string,
  students: StudentProfile[],
): Record<string, unknown>[] | null {
  const parsed = safeParseAiJson<Record<string, unknown>>(aiResponse, 'talent-discovery');
  if (!parsed) return null;

  try {
    const items: DiscoveryItem[] = (parsed.discoveries as DiscoveryItem[]) || (Array.isArray(parsed) ? parsed : []);

    return items.map((item) => {
      const idx = (item.student_index || item.studentIndex || 1) - 1;
      const student = students[idx] || students[0];
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        summary: item.summary as string,
        talkingPoints: (item.talking_points || item.talkingPoints) as string[],
        fitScore: (item.fit_score ?? item.fitScore) as number,
      };
    });
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'corporate_partner') {
      return NextResponse.json({ error: 'Talent discovery is available to corporate partners only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = talentDiscoverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { listingId, studentIds } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'candidate_screening');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 },
      );
    }

    // Step 2: Fetch listing and verify ownership
    const listingRows = await sql`
      SELECT id, title, description, skills_required, category, compensation,
             hours_per_week, remote_allowed
      FROM listings
      WHERE id = ${listingId} AND author_id = ${userId}
    `;

    if (listingRows.length === 0) {
      return NextResponse.json({ error: 'Listing not found or access denied' }, { status: 404 });
    }

    const listing = listingRows[0];

    // Step 3: Fetch student profiles
    const studentRows = await sql`
      SELECT id, first_name, last_name, university, major, gpa, bio
      FROM users
      WHERE id = ANY(${studentIds}) AND role = 'student'
    `;

    if (studentRows.length === 0) {
      return NextResponse.json({ error: 'No valid students found' }, { status: 404 });
    }

    // Step 4: Fetch skills for all students
    const studentIdList = studentRows.map((s: Record<string, unknown>) => s.id as string);
    const skillRows = await sql`
      SELECT us.user_id, s.name
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ANY(${studentIdList})
    `;

    // Group skills by student
    const skillsByStudent: Record<string, string[]> = {};
    for (const row of skillRows) {
      const uid = row.user_id as string;
      if (!skillsByStudent[uid]) skillsByStudent[uid] = [];
      skillsByStudent[uid].push(row.name as string);
    }

    const students: StudentProfile[] = studentRows.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      firstName: s.first_name as string,
      lastName: s.last_name as string,
      university: s.university as string | null,
      major: s.major as string | null,
      gpa: s.gpa as string | null,
      bio: s.bio as string | null,
      skills: skillsByStudent[s.id as string] || [],
    }));

    // Step 5: Build prompt and call Claude
    const systemPrompt = buildDiscoveryPrompt(listing, students);

    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        { role: 'user', content: 'Please analyze these students and provide talent discovery insights for my project.' },
      ],
      maxTokens: 3072,
    });

    // Step 6: Parse response
    const discoveries = parseDiscoveryResponse(aiResponse, students);
    if (!discoveries) {
      console.error('Failed to parse AI talent discovery response:', aiResponse);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Step 7: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'candidate_screening');
    const usage = await getUsageStatusV2(tenantId, userId, 'candidate_screening');

    return NextResponse.json({ discoveries, usage });
  } catch (error) {
    console.error('AI talent discovery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
