/**
 * GET /api/tenant/ai-features — Get AI feature availability for the current tenant
 *
 * Returns the tenant's tier info, feature list with enabled/disabled status,
 * and usage statistics. Requires educational_admin role.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

interface AiFeatureDefinition {
  key: string;
  label: string;
  description: string;
  icon: string;
  requiredPlan: 'starter' | 'professional' | 'enterprise';
  featureKey: string;
}

const AI_FEATURES: AiFeatureDefinition[] = [
  {
    key: 'aiCoaching',
    label: 'Student Coaching',
    description: 'AI-powered coaching sessions to help students prepare for projects and career development.',
    icon: 'GraduationCap',
    requiredPlan: 'starter',
    featureKey: 'aiCoaching',
  },
  {
    key: 'aiMatchInsights',
    label: 'Match Insights',
    description: 'AI analysis of student-project compatibility, highlighting strengths and growth areas.',
    icon: 'Target',
    requiredPlan: 'professional',
    featureKey: 'aiMatchInsights',
  },
  {
    key: 'aiDiffView',
    label: 'Resume Diff View',
    description: 'AI-powered resume improvement suggestions with before/after comparison.',
    icon: 'FileText',
    requiredPlan: 'professional',
    featureKey: 'aiDiffView',
  },
  {
    key: 'aiProjectScoping',
    label: 'Project Scoping',
    description: 'AI review of project listings to ensure scope, requirements, and student fit are well-defined.',
    icon: 'ClipboardList',
    requiredPlan: 'professional',
    featureKey: 'aiProjectScoping',
  },
  {
    key: 'aiPortfolioIntelligence',
    label: 'Portfolio Intelligence',
    description: 'Advanced analytics on student portfolios, skill distribution, and institutional strengths.',
    icon: 'BarChart3',
    requiredPlan: 'enterprise',
    featureKey: 'aiPortfolioIntelligence',
  },
  {
    key: 'aiTalentInsights',
    label: 'Talent Insights',
    description: 'Market-level talent analysis showing industry demand trends and talent supply from your institution.',
    icon: 'TrendingUp',
    requiredPlan: 'enterprise',
    featureKey: 'aiTalentInsights',
  },
  {
    key: 'aiInstitutionalAnalytics',
    label: 'Institutional Analytics',
    description: 'Deep institutional performance metrics, outcome tracking, and cross-cohort benchmarking.',
    icon: 'Building2',
    requiredPlan: 'enterprise',
    featureKey: 'aiPortfolioIntelligence',
  },
];

const PLAN_HIERARCHY: Record<string, number> = {
  starter: 0,
  professional: 1,
  enterprise: 2,
};

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'educational_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const [tenant] = await sql`
      SELECT features FROM tenants WHERE id = ${tenantId}
    `;

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const features = (tenant.features || {}) as Record<string, unknown>;
    const plan = String(features.plan || 'starter');
    const planLevel = PLAN_HIERARCHY[plan] ?? 0;

    // Build feature list with enabled/locked status
    const featureList = AI_FEATURES.map((f) => {
      const requiredLevel = PLAN_HIERARCHY[f.requiredPlan] ?? 0;
      const planAllows = planLevel >= requiredLevel;
      const featureEnabled = !!features[f.featureKey];
      const enabled = planAllows && featureEnabled;

      return {
        key: f.key,
        label: f.label,
        description: f.description,
        icon: f.icon,
        requiredPlan: f.requiredPlan,
        enabled,
        locked: !planAllows,
      };
    });

    // Get usage stats for this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const usageRows = await sql`
      SELECT
        feature,
        COUNT(*) as count
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${monthStart}
      GROUP BY feature
    `;

    const usageByFeature: Record<string, number> = {};
    let totalUsage = 0;
    for (const row of usageRows) {
      usageByFeature[row.feature] = Number(row.count);
      totalUsage += Number(row.count);
    }

    // Determine monthly limit based on plan
    const monthlyLimits: Record<string, number> = {
      starter: 100,
      professional: 1000,
      enterprise: -1, // unlimited
    };
    const monthlyLimit = monthlyLimits[plan] ?? 100;

    // Per-student coaching limit
    const coachingLimits: Record<string, number> = {
      starter: 5,
      professional: 25,
      enterprise: -1,
    };
    const perStudentCoachingLimit = coachingLimits[plan] ?? 5;

    return NextResponse.json({
      plan,
      planLabel: plan.charAt(0).toUpperCase() + plan.slice(1),
      features: featureList,
      usage: {
        byFeature: usageByFeature,
        totalThisMonth: totalUsage,
        monthlyLimit,
        perStudentCoachingLimit,
      },
    });
  } catch (error) {
    console.error('Tenant AI features GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
