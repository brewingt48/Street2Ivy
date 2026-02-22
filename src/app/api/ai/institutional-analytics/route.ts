/**
 * GET  /api/ai/institutional-analytics — Fetch the latest report for the tenant
 * POST /api/ai/institutional-analytics — Generate a new institutional analytics report
 *
 * Enterprise-only feature that aggregates student data, project outcomes, and
 * skill distributions across the tenant, then uses Claude to produce a
 * comprehensive institutional analytics report. Reports are persisted in the
 * `institutional_analytics_reports` table for retrieval.
 *
 * Restricted to educational_admin role on enterprise-tier tenants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { checkAiAccessV2, incrementUsageV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { safeParseAiJson } from '@/lib/ai/parse-json';

// -------------------------------------------------------------------------
// GET — Fetch latest report
// -------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin') {
      return NextResponse.json(
        { error: 'Institutional analytics is available to education administrators only' },
        { status: 403 }
      );
    }

    const tenantId = session.data.tenantId;

    const reportRows = await sql`
      SELECT id, tenant_id, engagement_summary, skill_gap_analysis,
             curriculum_recommendations, student_success_patterns,
             platform_benchmark, total_students, total_projects, generated_at
      FROM institutional_analytics_reports
      WHERE tenant_id = ${tenantId}
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    if (reportRows.length === 0) {
      return NextResponse.json({
        report: null,
        message: 'No reports generated yet. Use POST to generate a new report.',
      });
    }

    const row = reportRows[0];
    return NextResponse.json({
      report: {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        data: {
          executiveSummary: row.engagement_summary,
          skillAnalysis: row.skill_gap_analysis,
          strategicRecommendations: row.curriculum_recommendations,
          studentEngagement: { analysis: row.student_success_patterns },
          benchmarkScore: row.platform_benchmark,
        },
        totalStudents: row.total_students,
        totalProjects: row.total_projects,
        createdAt: (row.generated_at as Date).toISOString(),
      },
    });
  } catch (error) {
    console.error('Institutional analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -------------------------------------------------------------------------
// POST — Generate new report
// -------------------------------------------------------------------------

export async function POST(_request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin') {
      return NextResponse.json(
        { error: 'Institutional analytics is available to education administrators only' },
        { status: 403 }
      );
    }

    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Step 1: Check AI access for institutional_analytics
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'institutional_analytics');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'Access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Step 2: Aggregate data for the tenant

    // Total students
    const studentCountRows = await sql`
      SELECT COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student'
    `;
    const totalStudents = Number(studentCountRows[0]?.count ?? 0);

    // Active projects (published listings for this tenant)
    const activeProjectRows = await sql`
      SELECT COUNT(*) as count FROM listings
      WHERE tenant_id = ${tenantId} AND status = 'published'
    `;
    const activeProjects = Number(activeProjectRows[0]?.count ?? 0);

    // Completed projects
    const completedProjectRows = await sql`
      SELECT COUNT(*) as count FROM listings
      WHERE tenant_id = ${tenantId} AND status = 'completed'
    `;
    const completedProjects = Number(completedProjectRows[0]?.count ?? 0);

    // Skill distribution (via user_skills + skills join)
    const skillRows = await sql`
      SELECT s.name, COUNT(*) as count
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      JOIN users u ON us.user_id = u.id
      WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 25
    `;

    const skillDistribution: Array<{ skill: string; count: number }> = skillRows.map(
      (r: Record<string, unknown>) => ({
        skill: r.name as string,
        count: Number(r.count),
      })
    );

    // Student success patterns: application outcomes
    const applicationRows = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE a.status = 'rejected') as rejected
      FROM project_applications a
      JOIN users u ON a.student_id = u.id
      WHERE u.tenant_id = ${tenantId}
    `;
    const totalApplications = Number(applicationRows[0]?.total ?? 0);
    const acceptedApplications = Number(applicationRows[0]?.accepted ?? 0);
    const completedApplications = Number(applicationRows[0]?.completed ?? 0);
    const rejectedApplications = Number(applicationRows[0]?.rejected ?? 0);

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

    // Major distribution
    const majorRows = await sql`
      SELECT major, COUNT(*) as count FROM users
      WHERE tenant_id = ${tenantId} AND role = 'student' AND major IS NOT NULL
      GROUP BY major
      ORDER BY count DESC
      LIMIT 15
    `;
    const majorDistribution: Record<string, number> = {};
    for (const row of majorRows) {
      majorDistribution[row.major as string] = Number(row.count);
    }

    // Average student rating
    let avgRating: number | null = null;
    try {
      const ratingRows = await sql`
        SELECT AVG(r.rating) as avg_rating
        FROM student_ratings r
        JOIN users u ON r.student_id = u.id
        WHERE u.tenant_id = ${tenantId} AND u.role = 'student'
      `;
      avgRating = ratingRows[0]?.avg_rating ? Number(ratingRows[0].avg_rating) : null;
    } catch {
      // student_ratings table may not exist
    }

    // Step 3: Build prompt for Claude
    const systemPrompt = [
      `You are an institutional analytics advisor for Proveground. Analyze the following data about a university's engagement with the platform and produce a comprehensive analytics report.`,
      ``,
      `## Institutional Data`,
      `- Total Students on Platform: ${totalStudents}`,
      `- Active Projects (Published Listings): ${activeProjects}`,
      `- Completed Projects: ${completedProjects}`,
      avgGpa !== null ? `- Average Student GPA: ${avgGpa.toFixed(2)}` : '',
      avgRating !== null ? `- Average Student Rating: ${avgRating.toFixed(1)}/5` : '',
      ``,
      `## Application Outcomes`,
      `- Total Applications: ${totalApplications}`,
      `- Accepted: ${acceptedApplications}`,
      `- Completed: ${completedApplications}`,
      `- Rejected: ${rejectedApplications}`,
      totalApplications > 0 ? `- Acceptance Rate: ${((acceptedApplications / totalApplications) * 100).toFixed(1)}%` : '',
      totalApplications > 0 ? `- Completion Rate: ${((completedApplications / totalApplications) * 100).toFixed(1)}%` : '',
      ``,
      `## Skill Distribution (top skills among students)`,
      ...skillDistribution.map((s) => `- ${s.skill}: ${s.count} students`),
      ``,
      `## Graduation Year Distribution`,
      ...Object.entries(graduationDistribution).map(([year, count]) => `- ${year}: ${count} students`),
      ``,
      `## Major Distribution`,
      ...Object.entries(majorDistribution).map(([major, count]) => `- ${major}: ${count} students`),
      ``,
      `## Instructions`,
      `Generate a comprehensive institutional analytics report as a JSON object with these exact fields:`,
      `- "executiveSummary": A 3-5 sentence high-level summary of the institution's engagement and outcomes`,
      `- "studentEngagement": An object with:`,
      `  - "score": A number from 0-100 representing overall student engagement`,
      `  - "highlights": An array of 3-5 strings describing engagement highlights`,
      `  - "concerns": An array of 0-3 strings describing engagement concerns`,
      `- "skillAnalysis": An object with:`,
      `  - "topStrengths": An array of 3-5 skill names that are well-represented`,
      `  - "gaps": An array of 3-5 skill names that are underrepresented relative to market demand`,
      `  - "recommendations": An array of 3-5 actionable suggestions for curriculum alignment`,
      `- "projectOutcomes": An object with:`,
      `  - "successRate": A number from 0-100`,
      `  - "analysis": A 2-3 sentence analysis of project outcome patterns`,
      `  - "improvements": An array of 2-4 suggestions to improve project outcomes`,
      `- "strategicRecommendations": An array of 4-6 actionable strategic recommendations`,
      `- "benchmarkScore": A number from 0-100 representing how well the institution compares to platform averages`,
      ``,
      `Return ONLY valid JSON, no markdown.`,
    ]
      .filter(Boolean)
      .join('\n');

    // Step 4: Call Claude
    const aiResponse = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Please analyze this institutional data and generate a comprehensive analytics report.',
        },
      ],
      maxTokens: 4096,
    });

    // Step 5: Parse JSON response
    const reportData = safeParseAiJson<Record<string, unknown>>(aiResponse, 'institutional-analytics');
    if (!reportData) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 6: Store the report in institutional_analytics_reports
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = now.toISOString().split('T')[0];

    const execSummary = (reportData.executiveSummary as string) || null;
    const skillAnalysis = JSON.stringify(reportData.skillAnalysis || null);
    const strategicRecs = JSON.stringify(reportData.strategicRecommendations || null);
    const projectOutcomes = reportData.projectOutcomes as Record<string, unknown> | undefined;
    const successPatterns = (projectOutcomes?.analysis as string) || null;
    const benchmark = JSON.stringify({ score: reportData.benchmarkScore, engagement: reportData.studentEngagement });

    const insertedRows = await sql`
      INSERT INTO institutional_analytics_reports (
        tenant_id, reporting_period_start, reporting_period_end,
        engagement_summary, skill_gap_analysis, curriculum_recommendations,
        student_success_patterns, platform_benchmark,
        total_students, total_projects, model_used
      )
      VALUES (
        ${tenantId}, ${periodStart}, ${periodEnd},
        ${execSummary},
        ${skillAnalysis}::jsonb,
        ${strategicRecs}::jsonb,
        ${successPatterns},
        ${benchmark}::jsonb,
        ${totalStudents}, ${activeProjects + completedProjects},
        ${accessCheck.config.model}
      )
      RETURNING id, generated_at
    `;

    // Step 7: Increment usage
    await incrementUsageV2(tenantId, userId, 'institutional_analytics');

    return NextResponse.json({
      report: {
        id: insertedRows[0].id as string,
        tenantId,
        data: reportData,
        createdAt: (insertedRows[0].generated_at as Date).toISOString(),
      },
    });
  } catch (error) {
    console.error('Institutional analytics POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
