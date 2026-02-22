/**
 * POST /api/ai/talent-insights — Enterprise talent market insights
 *
 * Analyzes project listings, required skills, and student skill distribution
 * to provide demand trends, emerging skills, market alignment scores,
 * and actionable items. Restricted to educational_admin role on enterprise-tier tenants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { buildTalentInsightsPrompt } from '@/lib/ai/prompts';
import { askClaude } from '@/lib/ai/claude-client';
import { safeParseAiJson } from '@/lib/ai/parse-json';

export async function POST(_request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin') {
      return NextResponse.json(
        { error: 'Talent insights are available to education administrators only' },
        { status: 403 }
      );
    }

    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access for talent_insights feature
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'talent_insights');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Fetch data for analysis

    // Active listings count
    const listingCountRows = await sql`
      SELECT COUNT(*) as count FROM listings
      WHERE tenant_id = ${tenantId} AND status = 'published'
    `;
    const activeListings = Number(listingCountRows[0]?.count ?? 0);

    // Listing categories / industry breakdown
    const categoryRows = await sql`
      SELECT category, COUNT(*) as count FROM listings
      WHERE tenant_id = ${tenantId} AND status = 'published' AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    const industryBreakdown: Record<string, number> = {};
    for (const row of categoryRows) {
      industryBreakdown[row.category as string] = Number(row.count);
    }

    // Most requested skills from listings
    const requestedSkillRows = await sql`
      SELECT skill, COUNT(*) as count
      FROM (
        SELECT unnest(skills_required) as skill FROM listings
        WHERE tenant_id = ${tenantId} AND status = 'published'
      ) sub
      GROUP BY skill
      ORDER BY count DESC
      LIMIT 20
    `;
    const topRequestedSkills: Array<{ skill: string; count: number }> = requestedSkillRows.map(
      (r: Record<string, unknown>) => ({
        skill: r.skill as string,
        count: Number(r.count),
      })
    );

    // Student skill distribution
    const studentSkillRows = await sql`
      SELECT s.name as skill, COUNT(*) as count
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN users u ON us.user_id = u.id
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 20
    `;
    const studentSkillDistribution: Array<{ skill: string; count: number }> = studentSkillRows.map(
      (r: Record<string, unknown>) => ({
        skill: r.skill as string,
        count: Number(r.count),
      })
    );

    // Application success rates
    const applicationRows = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE a.status = 'rejected') as rejected
      FROM project_applications a
      JOIN users u ON a.student_id = u.id
      WHERE u.tenant_id = ${tenantId}
    `;
    const totalApplications = Number(applicationRows[0]?.total ?? 0);
    const acceptedApplications = Number(applicationRows[0]?.accepted ?? 0);
    const successRate = totalApplications > 0
      ? ((acceptedApplications / totalApplications) * 100).toFixed(1)
      : '0';

    // Average hours per week from listings
    const hoursRows = await sql`
      SELECT AVG(hours_per_week) as avg_hours FROM listings
      WHERE tenant_id = ${tenantId} AND status = 'published' AND hours_per_week IS NOT NULL
    `;
    const avgHoursPerWeek = hoursRows[0]?.avg_hours ? Number(hoursRows[0].avg_hours) : 0;

    // Step 3: Build prompt with data
    const systemPrompt = buildTalentInsightsPrompt({
      activeListings,
      topRequestedSkills,
      industryBreakdown,
      avgHoursPerWeek,
    });

    // Append student skill context and JSON format instructions
    const fullPrompt = [
      systemPrompt,
      ``,
      `## Student Skill Supply`,
      ...studentSkillDistribution.map((s) => `- ${s.skill}: ${s.count} students`),
      ``,
      `## Application Metrics`,
      `- Total Applications: ${totalApplications}`,
      `- Acceptance Rate: ${successRate}%`,
      ``,
      `## Response Format`,
      `Return a JSON object with exactly these fields:`,
      `- "demandTrends": An array of objects, each with:`,
      `  - "skill": The skill name (string)`,
      `  - "demand": One of "high", "medium", or "low"`,
      `  - "trend": One of "rising", "stable", or "declining"`,
      `- "emergingSkills": An array of 3-6 skill name strings that are emerging in demand`,
      `- "marketAlignment": A number from 0-100 representing how well student skills match market demand`,
      `- "actionItems": An array of 4-6 actionable recommendation strings`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ].join('\n');

    // Step 4: Ask Claude
    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt: fullPrompt,
      messages: [
        {
          role: 'user',
          content: 'Please analyze the talent market data and provide insights on demand trends and market alignment.',
        },
      ],
      maxTokens: 3072,
    });

    // Step 5: Parse JSON response
    const aiParsed = safeParseAiJson<Record<string, unknown>>(aiResponse, 'talent-insights');
    if (!aiParsed) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    const insights = {
      demandTrends: ((aiParsed.demandTrends || aiParsed.demand_trends) as Array<{ skill: string; demand: string; trend: string }>).map(
        (d) => ({
          skill: d.skill,
          demand: d.demand as 'high' | 'medium' | 'low',
          trend: d.trend as 'rising' | 'stable' | 'declining',
        })
      ),
      emergingSkills: (aiParsed.emergingSkills || aiParsed.emerging_skills) as string[],
      marketAlignment: (aiParsed.marketAlignment ?? aiParsed.market_alignment) as number,
      actionItems: (aiParsed.actionItems || aiParsed.action_items) as string[],
    };

    // Step 6: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'talent_insights');
    const usage = await getUsageStatusV2(tenantId, userId, 'talent_insights');

    return NextResponse.json({ insights, usage });
  } catch (error) {
    console.error('AI talent insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
