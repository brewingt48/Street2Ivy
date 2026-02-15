/**
 * Tenant Feature Gate Utility
 *
 * Checks whether a tenant has access to a specific feature
 * based on their plan tier and individual feature overrides.
 *
 * Plan Tiers:
 *   - starter: Basic features only
 *   - professional: Enhanced reporting, ratings, matching
 *   - enterprise: Everything + API access
 */

import { sql } from '@/lib/db';

/** All gatable features and which plan tiers include them */
export const FEATURE_DEFINITIONS: Record<string, {
  label: string;
  description: string;
  plans: string[]; // which plans include this feature by default
}> = {
  aiCoaching: {
    label: 'AI Coaching',
    description: 'AI-powered career coaching for students',
    plans: ['professional', 'enterprise'],
  },
  customBranding: {
    label: 'Custom Branding',
    description: 'Custom colors, logo, and hero video',
    plans: ['professional', 'enterprise'],
  },
  analytics: {
    label: 'Analytics',
    description: 'Detailed analytics dashboards for students, corporates, and edu admins',
    plans: ['professional', 'enterprise'],
  },
  apiAccess: {
    label: 'API Access',
    description: 'Programmatic API access for integrations',
    plans: ['enterprise'],
  },
  advancedReporting: {
    label: 'Advanced Reporting',
    description: 'Top performing students, student leaderboards, and detailed performance reports',
    plans: ['professional', 'enterprise'],
  },
  studentRatings: {
    label: 'Student Ratings',
    description: 'Private student performance ratings from corporate partners visible to edu admins',
    plans: ['professional', 'enterprise'],
  },
  corporateRatings: {
    label: 'Corporate Ratings',
    description: 'Public ratings of corporate partners from students',
    plans: ['professional', 'enterprise'],
  },
  matchingAlgorithm: {
    label: 'Smart Matching',
    description: 'AI-powered student-project matching algorithm with skill alignment scoring',
    plans: ['professional', 'enterprise'],
  },
  issueReporting: {
    label: 'Issue Reporting',
    description: 'Students can report safety, harassment, or other issues to edu admins',
    plans: ['professional', 'enterprise'],
  },
  inviteManagement: {
    label: 'Invite Management',
    description: 'Corporate partners can send direct invitations to students',
    plans: ['starter', 'professional', 'enterprise'],
  },
  aiMatchInsights: {
    label: 'AI Match Insights',
    description: 'AI-generated insights for student-project match analysis',
    plans: ['professional', 'enterprise'],
  },
  aiDiffView: {
    label: 'AI Diff View',
    description: 'AI-powered resume improvement with side-by-side comparison',
    plans: ['professional', 'enterprise'],
  },
  aiProjectScoping: {
    label: 'AI Project Scoping',
    description: 'AI-assisted project description review and milestone generation',
    plans: ['professional', 'enterprise'],
  },
  aiPortfolioIntelligence: {
    label: 'AI Portfolio Intelligence',
    description: 'Cross-student skills analysis and program effectiveness insights',
    plans: ['enterprise'],
  },
  aiTalentInsights: {
    label: 'AI Talent Insights',
    description: 'Industry trend matching and talent demand analysis',
    plans: ['enterprise'],
  },
  // --- ProveGround Match Engine™ ---
  matchEngine: {
    label: 'Match Engine\u2122',
    description: 'Proprietary bi-directional match scoring with schedule awareness',
    plans: ['professional', 'enterprise'],
  },
  matchEngineSchedule: {
    label: 'Schedule Management',
    description: 'Student schedule management for schedule-aware matching',
    plans: ['professional', 'enterprise'],
  },
  matchEngineAttractive: {
    label: 'Corporate Attractiveness',
    description: 'Reverse-direction scoring — how attractive is a listing to students',
    plans: ['enterprise'],
  },
  matchEngineAdmin: {
    label: 'Match Engine\u2122 Admin',
    description: 'Admin API for Match Engine\u2122 configuration and monitoring',
    plans: ['enterprise'],
  },
};

/** Plan defaults — includes new premium features */
export const PLAN_DEFAULTS: Record<string, Record<string, unknown>> = {
  starter: {
    maxStudents: 100,
    maxListings: 10,
    aiCoaching: true,
    customBranding: false,
    analytics: false,
    apiAccess: false,
    advancedReporting: false,
    studentRatings: false,
    corporateRatings: false,
    matchingAlgorithm: false,
    issueReporting: false,
    inviteManagement: true,
    aiMatchInsights: false,
    aiDiffView: false,
    aiProjectScoping: false,
    aiPortfolioIntelligence: false,
    aiTalentInsights: false,
    matchEngine: false,
    matchEngineSchedule: false,
    matchEngineAttractive: false,
    matchEngineAdmin: false,
  },
  professional: {
    maxStudents: 500,
    maxListings: 50,
    aiCoaching: true,
    customBranding: true,
    analytics: true,
    apiAccess: false,
    advancedReporting: true,
    studentRatings: true,
    corporateRatings: true,
    matchingAlgorithm: true,
    issueReporting: true,
    inviteManagement: true,
    aiMatchInsights: true,
    aiDiffView: true,
    aiProjectScoping: true,
    aiPortfolioIntelligence: false,
    aiTalentInsights: false,
    matchEngine: true,
    matchEngineSchedule: true,
    matchEngineAttractive: false,
    matchEngineAdmin: false,
  },
  enterprise: {
    maxStudents: -1, // unlimited
    maxListings: -1,
    aiCoaching: true,
    customBranding: true,
    analytics: true,
    apiAccess: true,
    advancedReporting: true,
    studentRatings: true,
    corporateRatings: true,
    matchingAlgorithm: true,
    issueReporting: true,
    inviteManagement: true,
    aiMatchInsights: true,
    aiDiffView: true,
    aiProjectScoping: true,
    aiPortfolioIntelligence: true,
    aiTalentInsights: true,
    matchEngine: true,
    matchEngineSchedule: true,
    matchEngineAttractive: true,
    matchEngineAdmin: true,
  },
};

/**
 * Get features for a tenant by ID.
 * Returns the features JSONB from the tenants table.
 */
export async function getTenantFeatures(tenantId: string): Promise<Record<string, unknown>> {
  if (!tenantId) return {};
  const rows = await sql`SELECT features FROM tenants WHERE id = ${tenantId}`;
  if (rows.length === 0) return {};
  return (rows[0].features || {}) as Record<string, unknown>;
}

/**
 * Check if a tenant has access to a specific feature.
 *
 * System admins (no tenantId) always have access.
 * Returns true if the feature is explicitly enabled in features JSONB.
 */
export async function hasFeature(tenantId: string | null, featureKey: string): Promise<boolean> {
  // System admins always have access
  if (!tenantId) return true;

  const features = await getTenantFeatures(tenantId);
  return !!features[featureKey];
}

/**
 * Same as hasFeature but takes pre-fetched features object.
 * Use this when you already have the features from session/tenant context.
 */
export function checkFeature(features: Record<string, unknown>, featureKey: string): boolean {
  return !!features[featureKey];
}

/**
 * Get the plan name for a tenant.
 */
export async function getTenantPlan(tenantId: string): Promise<string> {
  const features = await getTenantFeatures(tenantId);
  return (features.plan as string) || 'starter';
}

/**
 * Get the subscription tier for a tenant.
 *
 * Reads `subscription_tier_id` from the tenants table and joins to
 * `subscription_tiers` to return the tier row. Returns null if the tenant
 * has no linked subscription tier or the tenant does not exist.
 */
export async function getTenantTier(tenantId: string): Promise<{
  tierId: string | null;
  tierName: string;
  tierConfig: Record<string, unknown>;
} | null> {
  if (!tenantId) return null;

  try {
    const rows = await sql`
      SELECT
        t.subscription_tier_id,
        st.name  AS tier_name,
        st.ai_config
      FROM tenants t
      LEFT JOIN subscription_tiers st ON st.id = t.subscription_tier_id
      WHERE t.id = ${tenantId}
    `;

    if (rows.length === 0) return null;

    const row = rows[0];

    // If no subscription_tier_id linked, return a minimal result using the plan from features
    if (!row.subscription_tier_id) {
      const features = await getTenantFeatures(tenantId);
      const plan = (features.plan as string) || 'starter';
      return {
        tierId: null,
        tierName: plan,
        tierConfig: {},
      };
    }

    return {
      tierId: row.subscription_tier_id as string,
      tierName: (row.tier_name as string) || 'unknown',
      tierConfig: (row.ai_config || {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
