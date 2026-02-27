/**
 * Enhanced AI Feature Gate (v2)
 *
 * Central gating system for all AI features. Every AI endpoint should call
 * `checkAiAccess` before executing any AI operation.
 *
 * Resolution order:
 *   1. subscription_tiers.ai_config (JSONB) — canonical tier configuration
 *   2. tenants.features.plan → AI_TIER_CONFIGS fallback (backward compat)
 *   3. tenant_ai_overrides — per-tenant overrides (deep merged)
 *
 * Usage tracking is per-user per-feature per-month in `ai_usage_counters_v2`.
 * The old `ai_usage_counters` table is also incremented for backward compat.
 */

import { sql } from '@/lib/db';
import { AI_TIER_CONFIGS } from './config';
import type {
  TenantAiConfig,
  AiAccessResult,
  AiFeatureKey,
} from './types';

// ---------------------------------------------------------------------------
// Default configs per plan (fallback when no subscription_tiers row exists)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIGS: Record<string, TenantAiConfig> = {
  starter: {
    enabled: true,
    model: 'claude-haiku-4-5-20250901',
    modelDisplayName: 'Claude Haiku',
    maxTokens: 1024,
    streaming: false,
    studentCoaching: {
      enabled: true,
      interactionsPerStudentPerMonth: 10,
      quickActionsOnly: true,
      allowedQuickActions: ['resume_review', 'career_advice', 'general'],
      matchScoreCard: false,
      diffView: false,
      conversationMemory: false,
      confidenceMeter: false,
      maxTurnsPerSession: 5,
    },
    projectScoping: {
      enabled: false,
      interactionsPerUserPerMonth: 0,
      allowedFeatures: [],
      milestoneGeneration: false,
      skillsSuggestions: false,
      fullScopingWizard: false,
      maxTurnsPerSession: 0,
    },
    portfolioIntelligence: { enabled: false },
    talentInsights: { enabled: false },
    institutionalAnalytics: { enabled: false },
    rateLimits: { perUserPerHour: 10, perTenantPerHour: 100 },
  },
  professional: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    modelDisplayName: 'Claude Sonnet',
    maxTokens: 2048,
    streaming: true,
    studentCoaching: {
      enabled: true,
      interactionsPerStudentPerMonth: 50,
      quickActionsOnly: false,
      allowedQuickActions: [
        'resume_review',
        'interview_prep',
        'cover_letter',
        'career_advice',
        'skill_gap',
        'general',
      ],
      matchScoreCard: true,
      diffView: true,
      conversationMemory: true,
      confidenceMeter: true,
      maxTurnsPerSession: 20,
    },
    projectScoping: {
      enabled: true,
      interactionsPerUserPerMonth: 20,
      allowedFeatures: ['milestone_generation', 'skills_suggestions'],
      milestoneGeneration: true,
      skillsSuggestions: true,
      fullScopingWizard: false,
      maxTurnsPerSession: 10,
    },
    portfolioIntelligence: { enabled: false },
    talentInsights: { enabled: false },
    institutionalAnalytics: { enabled: false },
    rateLimits: { perUserPerHour: 30, perTenantPerHour: 500 },
  },
  enterprise: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    modelDisplayName: 'Claude Sonnet',
    maxTokens: 4096,
    streaming: true,
    studentCoaching: {
      enabled: true,
      interactionsPerStudentPerMonth: -1,
      quickActionsOnly: false,
      allowedQuickActions: [
        'resume_review',
        'interview_prep',
        'cover_letter',
        'career_advice',
        'skill_gap',
        'general',
      ],
      matchScoreCard: true,
      diffView: true,
      conversationMemory: true,
      confidenceMeter: true,
      maxTurnsPerSession: 50,
    },
    projectScoping: {
      enabled: true,
      interactionsPerUserPerMonth: -1,
      allowedFeatures: [
        'milestone_generation',
        'skills_suggestions',
        'full_scoping_wizard',
      ],
      milestoneGeneration: true,
      skillsSuggestions: true,
      fullScopingWizard: true,
      maxTurnsPerSession: 50,
    },
    portfolioIntelligence: {
      enabled: true,
      refreshFrequency: 'weekly',
      includeCareerNarrative: true,
      includeSkillProgression: true,
      includeStrengthsSummary: true,
    },
    talentInsights: {
      enabled: true,
      postProjectAssessment: true,
      standoutContributors: true,
      teamPerformanceSummary: true,
      includeHiringRecommendation: true,
    },
    institutionalAnalytics: {
      enabled: true,
      reportFrequency: 'monthly',
      skillGapAnalysis: true,
      engagementPatterns: true,
      curriculumRecommendations: true,
      benchmarkAgainstPlatform: true,
    },
    rateLimits: { perUserPerHour: 60, perTenantPerHour: 2000 },
  },
};

// ---------------------------------------------------------------------------
// In-memory cache (tenantId -> { config, fetchedAt })
// ---------------------------------------------------------------------------

const CONFIG_CACHE = new Map<
  string,
  { config: TenantAiConfig; fetchedAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(tenantId: string): TenantAiConfig | null {
  const entry = CONFIG_CACHE.get(tenantId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    CONFIG_CACHE.delete(tenantId);
    return null;
  }
  return entry.config;
}

function setCache(tenantId: string, config: TenantAiConfig): void {
  CONFIG_CACHE.set(tenantId, { config, fetchedAt: Date.now() });
}

/** Exported for testing — clears the in-memory config cache. */
export function clearConfigCache(): void {
  CONFIG_CACHE.clear();
}

// ---------------------------------------------------------------------------
// Deep merge utility
// ---------------------------------------------------------------------------

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: Record<string, unknown>,
): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    const baseVal = result[key];
    const overVal = overrides[key];
    if (
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal) &&
      overVal &&
      typeof overVal === 'object' &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>,
      );
    } else {
      result[key] = overVal;
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** First day of next month as ISO string */
function getResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

/** Current month key in YYYY-MM format (for backward-compat counter) */
function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Map a plan name from the old AI_TIER_CONFIGS to a full TenantAiConfig */
function mapLegacyPlan(plan: string): TenantAiConfig {
  // Ensure plan key is valid
  const key = DEFAULT_CONFIGS[plan] ? plan : 'starter';
  return { ...DEFAULT_CONFIGS[key] };
}

/** Resolve the feature section from a TenantAiConfig for an AiFeatureKey */
function getFeatureSection(
  config: TenantAiConfig,
  feature: AiFeatureKey,
): {
  enabled: boolean;
  limit: number;
  allowedActions?: string[];
} {
  switch (feature) {
    case 'student_coaching':
      return {
        enabled: config.studentCoaching.enabled,
        limit: config.studentCoaching.interactionsPerStudentPerMonth,
        allowedActions: config.studentCoaching.allowedQuickActions,
      };
    case 'project_scoping':
    case 'candidate_screening':
      return {
        enabled: config.projectScoping.enabled,
        limit: config.projectScoping.interactionsPerUserPerMonth,
        allowedActions: config.projectScoping.allowedFeatures,
      };
    case 'portfolio_intelligence':
      return {
        enabled: config.portfolioIntelligence.enabled,
        limit: -1, // no per-user limit for analytics features
      };
    case 'talent_insights':
      return {
        enabled: config.talentInsights.enabled,
        limit: -1,
      };
    case 'institutional_analytics':
      return {
        enabled: config.institutionalAnalytics.enabled,
        limit: -1,
      };
    default:
      return { enabled: false, limit: 0 };
  }
}

/** Map plan name to its next upgrade tier (if any) */
function getUpgradeTier(plan: string): { available: boolean; name?: string } {
  switch (plan) {
    case 'starter':
      return { available: true, name: 'Professional' };
    case 'professional':
      return { available: true, name: 'Enterprise' };
    default:
      return { available: false };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the full TenantAiConfig for a tenant.
 *
 * 1. System admins (null tenantId) -> enterprise defaults
 * 2. subscription_tiers.ai_config JSONB (canonical)
 * 3. Fallback: tenants.features.plan -> DEFAULT_CONFIGS
 * 4. Deep-merge active tenant_ai_overrides
 * 5. Cache result for 5 minutes
 */
export async function getTenantAiConfig(
  tenantId: string | null,
): Promise<TenantAiConfig> {
  // System admins always get enterprise config
  if (!tenantId) {
    return { ...DEFAULT_CONFIGS.enterprise };
  }

  // Check cache first
  const cached = getCached(tenantId);
  if (cached) return cached;

  // 1. Query tenant + subscription tier
  const rows = await sql`
    SELECT
      t.features,
      t.subscription_tier_id,
      st.ai_config,
      st.name AS tier_name
    FROM tenants t
    LEFT JOIN subscription_tiers st ON st.id = t.subscription_tier_id
    WHERE t.id = ${tenantId}
  `;

  let config: TenantAiConfig;

  if (rows.length === 0) {
    // Tenant not found — return starter defaults
    config = mapLegacyPlan('starter');
  } else {
    const row = rows[0];
    const aiConfigFromTier = row.ai_config as Record<string, unknown> | null;

    if (row.subscription_tier_id && aiConfigFromTier) {
      // Canonical path: use the subscription tier's ai_config JSONB
      config = deepMerge(
        { ...DEFAULT_CONFIGS.enterprise },
        aiConfigFromTier,
      );
    } else {
      // Fallback: map from features.plan using the legacy defaults
      const features = (row.features || {}) as Record<string, unknown>;
      const plan = (features.plan as string) || 'starter';
      config = mapLegacyPlan(plan);

      // Also respect the aiCoaching toggle from features JSONB
      if (features.aiCoaching === false) {
        config.enabled = false;
      }

      // Merge any legacy aiConfig overrides from features.aiConfig
      const legacyOverrides = features.aiConfig as Record<string, unknown> | undefined;
      if (legacyOverrides) {
        // Map old-style fields into the new structure where possible
        if (legacyOverrides.model) {
          config.model = legacyOverrides.model as string;
        }
        if (legacyOverrides.maxMonthlyUses !== undefined) {
          const maxUses = legacyOverrides.maxMonthlyUses as number;
          config.studentCoaching.interactionsPerStudentPerMonth = maxUses;
        }
      }
    }
  }

  // 2. Apply per-tenant overrides from tenant_ai_overrides table
  try {
    const overrideRows = await sql`
      SELECT override_key, override_value
      FROM tenant_ai_overrides
      WHERE tenant_id = ${tenantId}
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    for (const ov of overrideRows) {
      const key = ov.override_key as string;
      const value = ov.override_value as unknown;

      // Keys use dot notation: e.g. "studentCoaching.interactionsPerStudentPerMonth"
      const parts = key.split('.');
      if (parts.length === 1) {
        // Top-level override
        (config as unknown as Record<string, unknown>)[parts[0]] = value;
      } else if (parts.length === 2) {
        const section = (config as unknown as Record<string, unknown>)[
          parts[0]
        ] as Record<string, unknown> | undefined;
        if (section && typeof section === 'object') {
          section[parts[1]] = value;
        }
      }
    }
  } catch {
    // tenant_ai_overrides table may not exist yet — silently skip
  }

  // 3. Cache and return
  setCache(tenantId, config);
  return config;
}

/**
 * Check if a user is allowed to use a specific AI feature.
 *
 * Checks (in order):
 *   1. AI globally enabled for tenant
 *   2. Feature section enabled
 *   3. Action in allowed list (if action provided)
 *   4. Monthly usage limit (per-user per-feature)
 *
 * Returns a detailed AiAccessResult with denial reasons and upgrade hints.
 */
export async function checkAiAccess(
  tenantId: string | null,
  userId: string,
  feature: AiFeatureKey,
  action?: string,
): Promise<AiAccessResult> {
  const config = await getTenantAiConfig(tenantId);

  // 1. AI globally enabled?
  if (!config.enabled) {
    const upgrade = getUpgradeTier('starter');
    return {
      allowed: false,
      config,
      denial: {
        reason: 'ai_disabled',
        message: 'AI features are not enabled for your institution.',
        upgradeAvailable: upgrade.available,
        upgradeTierName: upgrade.name,
      },
    };
  }

  // 2. Feature section enabled?
  const section = getFeatureSection(config, feature);
  if (!section.enabled) {
    // Determine current plan for upgrade suggestion
    let plan = 'starter';
    if (tenantId) {
      try {
        const planRows = await sql`
          SELECT features FROM tenants WHERE id = ${tenantId}
        `;
        if (planRows.length > 0) {
          const feats = planRows[0].features as Record<string, unknown>;
          plan = (feats.plan as string) || 'starter';
        }
      } catch {
        // ignore
      }
    }
    const upgrade = getUpgradeTier(plan);
    return {
      allowed: false,
      config,
      denial: {
        reason: 'feature_disabled',
        message: `The ${feature.replace(/_/g, ' ')} feature is not available on your current plan.`,
        upgradeAvailable: upgrade.available,
        upgradeTierName: upgrade.name,
      },
    };
  }

  // 3. Action check (if provided)
  if (action && section.allowedActions) {
    if (!section.allowedActions.includes(action)) {
      const plan = 'starter'; // simplification
      const upgrade = getUpgradeTier(plan);
      return {
        allowed: false,
        config,
        denial: {
          reason: 'action_not_available',
          message: `The action "${action}" is not available on your current plan.`,
          upgradeAvailable: upgrade.available,
          upgradeTierName: upgrade.name,
        },
      };
    }
  }

  // 4. Monthly usage limit (skip for unlimited or system admins)
  if (tenantId && section.limit !== -1) {
    try {
      const usageRows = await sql`
        SELECT interaction_count
        FROM ai_usage_counters_v2
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND feature = ${feature}
          AND month = date_trunc('month', CURRENT_DATE)
      `;

      const used =
        usageRows.length > 0
          ? (usageRows[0].interaction_count as number)
          : 0;

      if (used >= section.limit) {
        return {
          allowed: false,
          config,
          denial: {
            reason: 'monthly_limit_reached',
            message: `You have reached the monthly limit of ${section.limit} interactions for ${feature.replace(/_/g, ' ')}.`,
            upgradeAvailable: true,
            upgradeTierName: 'Professional',
            resetDate: getResetDate(),
          },
        };
      }
    } catch {
      // ai_usage_counters_v2 table may not exist yet — allow access
    }
  }

  // All checks passed
  return { allowed: true, config };
}

/**
 * Increment the per-user per-feature usage counter.
 *
 * Upserts into `ai_usage_counters_v2` and also increments the legacy
 * `ai_usage_counters` table for backward compatibility.
 */
export async function incrementUsage(
  tenantId: string | null,
  userId: string,
  feature: string,
): Promise<void> {
  // System admins don't track usage
  if (!tenantId) return;

  // 1. Upsert into ai_usage_counters_v2
  try {
    await sql`
      INSERT INTO ai_usage_counters_v2 (tenant_id, user_id, feature, month, interaction_count)
      VALUES (${tenantId}, ${userId}, ${feature}, date_trunc('month', CURRENT_DATE), 1)
      ON CONFLICT (tenant_id, user_id, feature, month)
      DO UPDATE SET interaction_count = ai_usage_counters_v2.interaction_count + 1
    `;
  } catch {
    // ai_usage_counters_v2 may not exist yet — silently skip
  }

  // 2. Also increment legacy ai_usage_counters for backward compatibility
  try {
    const monthKey = getMonthKey();
    await sql`
      INSERT INTO ai_usage_counters (tenant_id, month_key, usage_count, last_used_at)
      VALUES (${tenantId}, ${monthKey}, 1, NOW())
      ON CONFLICT (tenant_id, month_key)
      DO UPDATE SET usage_count = ai_usage_counters.usage_count + 1, last_used_at = NOW()
    `;
  } catch {
    // Legacy table may have issues — don't block on it
  }
}

/**
 * Get the usage status for a specific user + feature in the current month.
 */
export async function getUsageStatus(
  tenantId: string | null,
  userId: string,
  feature: string,
): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
}> {
  const config = await getTenantAiConfig(tenantId);
  const section = getFeatureSection(config, feature as AiFeatureKey);
  const limit = section.limit;

  if (!tenantId) {
    return { used: 0, limit: -1, remaining: -1, resetDate: getResetDate() };
  }

  let used = 0;
  try {
    const rows = await sql`
      SELECT interaction_count
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND feature = ${feature}
        AND month = date_trunc('month', CURRENT_DATE)
    `;
    if (rows.length > 0) {
      used = rows[0].interaction_count as number;
    }
  } catch {
    // Table may not exist yet
  }

  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

  return { used, limit, remaining, resetDate: getResetDate() };
}

/**
 * Get aggregated usage status across all features for a tenant.
 * Intended for admin dashboards.
 */
export async function getFullUsageStatus(
  tenantId: string,
): Promise<Record<string, { used: number; limit: number }>> {
  const config = await getTenantAiConfig(tenantId);

  const featureKeys: AiFeatureKey[] = [
    'student_coaching',
    'project_scoping',
    'portfolio_intelligence',
    'talent_insights',
    'institutional_analytics',
  ];

  const result: Record<string, { used: number; limit: number }> = {};

  // Query all usage for this tenant in the current month
  let usageRows: Record<string, unknown>[] = [];
  try {
    usageRows = await sql`
      SELECT feature, SUM(interaction_count) AS total
      FROM ai_usage_counters_v2
      WHERE tenant_id = ${tenantId}
        AND month = date_trunc('month', CURRENT_DATE)
      GROUP BY feature
    `;
  } catch {
    // Table may not exist yet
  }

  const usageMap = new Map<string, number>();
  for (const row of usageRows) {
    usageMap.set(row.feature as string, Number(row.total));
  }

  for (const feature of featureKeys) {
    const section = getFeatureSection(config, feature);
    result[feature] = {
      used: usageMap.get(feature) || 0,
      limit: section.limit,
    };
  }

  return result;
}
