/**
 * POST /api/ai/portfolio-intelligence — Enterprise cross-student portfolio analysis
 *
 * Aggregates student data across the tenant and uses Claude to identify
 * program strengths, skill gaps, recommendations, and an industry readiness score.
 * Restricted to educational_admin role on enterprise-tier tenants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { buildPortfolioIntelligencePrompt } from '@/lib/ai/prompts';
import { askClaude } from '@/lib/ai/claude-client';

export async function POST(_request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin') {
      return NextResponse.json(
        { error: 'Portfolio intelligence is available to education administrators only' },
        { status: 403 }
      );
    }

    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access for portfolio_intelligence feature
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'portfolio_intelligence');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Fetch aggregate data for the tenant

    // Total students count
    const studentCountRows = await sql`
      SELECT COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student'
    `;
    const totalStudents = Number(studentCountRows[0]?.count ?? 0);

    // Skills distribution (top 20 skills by count)
    const skillRows = await sql`
      SELECT s.name, COUNT(*) as count
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN users u ON us.user_id = u.id
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 20
    `;

    const skillDistribution: Record<string, number> = {};
    const topSkills: string[] = [];
    for (const row of skillRows) {
      const name = row.name as string;
      const count = Number(row.count);
      skillDistribution[name] = count;
      topSkills.push(name);
    }

    // Average GPA
    const gpaRows = await sql`
      SELECT AVG(gpa::numeric) as avg_gpa FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student' AND gpa IS NOT NULL
    `;
    const avgGpa = gpaRows[0]?.avg_gpa ? Number(gpaRows[0].avg_gpa) : null;

    // Graduation year distribution
    const gradRows = await sql`
      SELECT graduation_year, COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student' AND graduation_year IS NOT NULL
      GROUP BY graduation_year
      ORDER BY graduation_year
    `;

    const graduationDistribution: Record<string, number> = {};
    for (const row of gradRows) {
      graduationDistribution[row.graduation_year as string] = Number(row.count);
    }

    // Majors distribution
    const majorRows = await sql`
      SELECT major, COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student' AND major IS NOT NULL
      GROUP BY major
      ORDER BY count DESC
      LIMIT 15
    `;

    const majorsDistribution: Record<string, number> = {};
    for (const row of majorRows) {
      majorsDistribution[row.major as string] = Number(row.count);
    }

    // Completion rate (applications accepted vs total)
    const completionRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
        COUNT(*) as total
      FROM project_applications a
      JOIN users u ON a.student_id = u.id
      WHERE u.tenant_id = ${tenantId}
    `;
    const completed = Number(completionRows[0]?.completed ?? 0);
    const totalApps = Number(completionRows[0]?.total ?? 1);
    const completionRate = totalApps > 0 ? completed / totalApps : 0;

    // Average student rating
    const ratingRows = await sql`
      SELECT AVG(r.rating) as avg_rating
      FROM student_ratings r
      JOIN users u ON r.rated_user_id = u.id
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
    `;
    const avgRating = ratingRows[0]?.avg_rating ? Number(ratingRows[0].avg_rating) : null;

    // Identify common missing skills from listings vs student skills
    const missingSkillRows = await sql`
      SELECT DISTINCT unnest(l.skills_required) as skill
      FROM listings l
      WHERE l.tenant_id = ${tenantId} AND l.status = 'published'
      EXCEPT
      SELECT DISTINCT s.name
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN users u ON us.user_id = u.id
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
      LIMIT 10
    `;
    const topMissingSkills: string[] = missingSkillRows.map(
      (r: Record<string, unknown>) => r.skill as string
    );

    // Step 3: Build prompt with aggregate data
    const systemPrompt = buildPortfolioIntelligencePrompt({
      totalStudents,
      skillDistribution,
      completionRate,
      avgRating,
      topSkills,
      topMissingSkills,
    });

    // Append JSON-specific instructions
    const fullPrompt = [
      systemPrompt,
      ``,
      `## Additional Context`,
      `- Average GPA: ${avgGpa !== null ? avgGpa.toFixed(2) : 'Not available'}`,
      `- Graduation Year Distribution: ${JSON.stringify(graduationDistribution)}`,
      `- Majors Distribution: ${JSON.stringify(majorsDistribution)}`,
      ``,
      `## Response Format`,
      `Return a JSON object with exactly these fields:`,
      `- "programStrengths": An array of 3-6 strings describing program strengths`,
      `- "skillGaps": An array of 3-6 strings identifying skill gaps`,
      `- "recommendations": An array of 4-6 actionable recommendation strings`,
      `- "industryReadiness": A number from 0-100 representing overall industry readiness`,
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
          content: 'Please analyze this student portfolio data and provide institutional insights.',
        },
      ],
      maxTokens: 3072,
    });

    // Step 5: Parse JSON response
    let insights;
    try {
      const parsed = JSON.parse(aiResponse);
      insights = {
        programStrengths: parsed.programStrengths as string[],
        skillGaps: parsed.skillGaps as string[],
        recommendations: parsed.recommendations as string[],
        industryReadiness: parsed.industryReadiness as number,
      };
    } catch {
      console.error('Failed to parse AI portfolio intelligence response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 6: Increment usage and return
    await incrementUsageV2(tenantId, userId, 'portfolio_intelligence');
    const usage = await getUsageStatusV2(tenantId, userId, 'portfolio_intelligence');

    return NextResponse.json({ insights, usage });
  } catch (error) {
    console.error('AI portfolio intelligence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
