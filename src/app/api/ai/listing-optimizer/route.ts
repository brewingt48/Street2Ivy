/**
 * POST /api/ai/listing-optimizer — AI-assisted listing optimization for corporate partners
 *
 * Analyzes a listing for attractiveness, clarity, and competitiveness,
 * then provides specific improvement suggestions and an optimized version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { safeParseAiJson } from '@/lib/ai/parse-json';

const listingOptimizerSchema = z.object({
  listingId: z.string().uuid(),
});

function buildOptimizerPrompt(
  listing: Record<string, unknown>,
  applicationCount: number,
  acceptanceRate: number | null,
): string {
  return [
    `You are a listing optimization specialist for Proveground, helping corporate partners create project listings that attract the best student talent.`,
    ``,
    `## Current Listing`,
    `- Title: ${listing.title as string}`,
    `- Description: ${(listing.description as string) || 'No description'}`,
    `- Required Skills: ${((listing.skills_required as string[]) || []).join(', ') || 'None specified'}`,
    `- Category: ${(listing.category as string) || 'Not specified'}`,
    `- Compensation: ${(listing.compensation as string) || 'Not specified'}`,
    `- Hours/Week: ${(listing.hours_per_week as string) || 'Not specified'}`,
    `- Duration: ${(listing.duration as string) || 'Not specified'}`,
    `- Remote Allowed: ${listing.remote_allowed ? 'Yes' : 'No'}`,
    `- Status: ${listing.status as string}`,
    ``,
    `## Performance Metrics`,
    `- Total Applications Received: ${applicationCount}`,
    `- Acceptance Rate: ${acceptanceRate !== null ? `${(acceptanceRate * 100).toFixed(0)}%` : 'N/A (no decisions yet)'}`,
    ``,
    `## Instructions`,
    `Analyze this listing and return a JSON object with:`,
    `- "attractiveness_score": A number from 1-10 rating how appealing this listing is to students (consider compensation, flexibility, growth opportunity, description quality)`,
    `- "clarity_score": A number from 1-10 rating how clear and well-structured the description is`,
    `- "improvements": An array of 3-6 specific improvement suggestions, each with:`,
    `  - "category": One of "description", "compensation", "skills", "flexibility", "title", "general"`,
    `  - "suggestion": The specific improvement recommendation`,
    `  - "impact": "high", "medium", or "low"`,
    `- "optimized_description": A rewritten, improved version of the project description`,
    `- "optimized_title": A suggested improved title (or the same title if it's already good)`,
    `- "summary": A 1-2 sentence overall assessment of the listing`,
    ``,
    `Return ONLY valid JSON, no markdown.`,
  ].join('\n');
}

function parseOptimizerResponse(aiResponse: string): Record<string, unknown> | null {
  const parsed = safeParseAiJson<Record<string, unknown>>(aiResponse, 'listing-optimizer');
  if (!parsed) return null;

  try {
    return {
      attractivenessScore: (parsed.attractiveness_score || parsed.attractivenessScore) as number,
      clarityScore: (parsed.clarity_score || parsed.clarityScore) as number,
      improvements: ((parsed.improvements) as Record<string, unknown>[]).map(
        (imp: Record<string, unknown>) => ({
          category: imp.category as string,
          suggestion: imp.suggestion as string,
          impact: imp.impact as string,
        })
      ),
      optimizedDescription: (parsed.optimized_description || parsed.optimizedDescription) as string,
      optimizedTitle: (parsed.optimized_title || parsed.optimizedTitle) as string,
      summary: parsed.summary as string,
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
      return NextResponse.json({ error: 'Listing optimizer is available to corporate partners only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = listingOptimizerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { listingId } = parsed.data;
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

    // Step 2: Fetch listing and verify ownership
    const listingRows = await sql`
      SELECT id, title, description, skills_required, category, compensation,
             hours_per_week, duration, remote_allowed, status
      FROM listings
      WHERE id = ${listingId} AND author_id = ${userId}
    `;

    if (listingRows.length === 0) {
      return NextResponse.json({ error: 'Listing not found or access denied' }, { status: 404 });
    }

    const listing = listingRows[0];

    // Step 3: Fetch application stats
    const statsRows = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted
      FROM project_applications
      WHERE listing_id = ${listingId}
    `;
    const appStats = statsRows[0] || { total: 0, accepted: 0 };
    const applicationCount = Number(appStats.total) || 0;
    const acceptanceRate = applicationCount > 0
      ? (Number(appStats.accepted) || 0) / applicationCount
      : null;

    // Step 4: Build prompt and call Claude
    const systemPrompt = buildOptimizerPrompt(listing, applicationCount, acceptanceRate);

    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        { role: 'user', content: 'Please analyze this listing and provide optimization recommendations.' },
      ],
      maxTokens: 3072,
    });

    // Step 5: Parse response
    const result = parseOptimizerResponse(aiResponse);
    if (!result) {
      console.error('Failed to parse AI listing optimizer response:', aiResponse);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Step 6: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'candidate_screening');
    const usage = await getUsageStatusV2(tenantId, userId, 'candidate_screening');

    return NextResponse.json({ result, usage });
  } catch (error) {
    console.error('AI listing optimizer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
