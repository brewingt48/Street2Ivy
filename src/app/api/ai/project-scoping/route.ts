/**
 * POST /api/ai/project-scoping — AI-assisted project description review and enhancement
 *
 * Helps corporate partners refine project listings by reviewing descriptions,
 * suggesting required skills, generating milestone timelines, or performing
 * a full scope analysis combining all three.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccess, incrementUsage, getUsageStatus } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';

const projectScopingSchema = z.object({
  description: z.string().min(1).max(10000),
  action: z.enum(['review_description', 'suggest_skills', 'generate_milestones', 'full_scope']),
});

/** Build the system prompt for a specific scoping action */
function buildScopingPrompt(description: string, action: string): string {
  const base = [
    `You are a project scoping assistant for Campus2Career, helping corporate partners create effective project listings that attract qualified students.`,
    ``,
    `## Project Description`,
    `${description}`,
    ``,
  ];

  if (action === 'review_description') {
    return [
      ...base,
      `## Instructions`,
      `Review this project description for clarity, completeness, and student appeal.`,
      ``,
      `Return a JSON object with:`,
      `- "feedback": Detailed feedback on the description (2-4 sentences covering clarity, specificity, and appeal)`,
      `- "improvedDescription": A rewritten, improved version of the project description`,
      `- "score": A number from 1-10 rating how attractive and clear this project is to students`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ].join('\n');
  }

  if (action === 'suggest_skills') {
    return [
      ...base,
      `## Instructions`,
      `Based on this project description, suggest the technical and soft skills a student would need.`,
      ``,
      `Return a JSON object with:`,
      `- "suggestedSkills": An array of 5-10 specific skill names (e.g., "Python", "Data Analysis", "Communication")`,
      `- "reasoning": A brief explanation of why these skills are needed for this project`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ].join('\n');
  }

  if (action === 'generate_milestones') {
    return [
      ...base,
      `## Instructions`,
      `Break this project into a milestone timeline suitable for a student working part-time.`,
      ``,
      `Return a JSON object with:`,
      `- "milestones": An array of 3-6 milestone objects, each with:`,
      `  - "title": Short milestone name`,
      `  - "description": What the student should accomplish in this phase`,
      `  - "weekNumber": The week number when this milestone should be completed (starting from week 1)`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ].join('\n');
  }

  // full_scope
  return [
    ...base,
    `## Instructions`,
    `Perform a full project scoping analysis. This includes:`,
    `1. Reviewing the description for clarity, completeness, and student appeal`,
    `2. Suggesting required skills`,
    `3. Generating a milestone timeline`,
    ``,
    `Return a JSON object with:`,
    `- "feedback": Detailed feedback on the description (2-4 sentences covering clarity, specificity, and appeal)`,
    `- "improvedDescription": A rewritten, improved version of the project description`,
    `- "score": A number from 1-10 rating how attractive and clear this project is to students`,
    `- "suggestedSkills": An array of 5-10 specific skill names`,
    `- "reasoning": A brief explanation of why these skills are needed`,
    `- "milestones": An array of 3-6 milestone objects, each with:`,
    `  - "title": Short milestone name`,
    `  - "description": What the student should accomplish in this phase`,
    `  - "weekNumber": The week number when this milestone should be completed`,
    ``,
    `Return ONLY valid JSON, no markdown.`,
  ].join('\n');
}

/** Parse and shape the Claude response for a given action */
function parseResponse(
  aiResponse: string,
  action: string
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(aiResponse);

    if (action === 'review_description') {
      return {
        feedback: parsed.feedback as string,
        improvedDescription: (parsed.improvedDescription || parsed.improved_description) as string,
        score: parsed.score as number,
      };
    }

    if (action === 'suggest_skills') {
      return {
        suggestedSkills: (parsed.suggestedSkills || parsed.suggested_skills) as string[],
        reasoning: parsed.reasoning as string,
      };
    }

    if (action === 'generate_milestones') {
      const milestones = (parsed.milestones as Record<string, unknown>[]).map(
        (m: Record<string, unknown>) => ({
          title: m.title as string,
          description: m.description as string,
          weekNumber: (m.weekNumber ?? m.week_number) as number,
        })
      );
      return { milestones };
    }

    // full_scope
    const milestones = (parsed.milestones as Record<string, unknown>[]).map(
      (m: Record<string, unknown>) => ({
        title: m.title as string,
        description: m.description as string,
        weekNumber: (m.weekNumber ?? m.week_number) as number,
      })
    );
    return {
      feedback: parsed.feedback as string,
      improvedDescription: (parsed.improvedDescription || parsed.improved_description) as string,
      score: parsed.score as number,
      suggestedSkills: (parsed.suggestedSkills || parsed.suggested_skills) as string[],
      reasoning: parsed.reasoning as string,
      milestones,
    };
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
      return NextResponse.json({ error: 'Project scoping is available to corporate partners only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = projectScopingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { description, action } = parsed.data;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access
    const accessCheck = await checkAiAccess(tenantId, 'project_scoping');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: 'AI access denied', reason: accessCheck.reason },
        { status: 403 }
      );
    }

    // Step 2: Build prompt and call Claude
    const systemPrompt = buildScopingPrompt(description, action);

    const actionLabels: Record<string, string> = {
      review_description: 'review this project description',
      suggest_skills: 'suggest required skills for this project',
      generate_milestones: 'generate a milestone timeline for this project',
      full_scope: 'perform a full project scoping analysis',
    };

    const aiResponse = await askClaude({
      model: accessCheck.model,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please ${actionLabels[action]}.`,
        },
      ],
      maxTokens: 3072,
    });

    // Step 3: Parse response
    const result = parseResponse(aiResponse, action);
    if (!result) {
      console.error('Failed to parse AI project scoping response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 4: Increment usage and return
    await incrementUsage(tenantId);
    const usage = await getUsageStatus(tenantId);

    return NextResponse.json({ result, usage });
  } catch (error) {
    console.error('AI project scoping error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
