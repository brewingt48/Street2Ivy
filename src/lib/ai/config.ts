/**
 * AI Tier Configuration & Feature Gate
 *
 * Manages three-tier AI access: Starter (Haiku), Professional (Sonnet), Enterprise (Sonnet unlimited).
 * Uses tenant features JSONB for config and a separate table for usage counting.
 *
 * @deprecated — This module is maintained for backward compatibility. New code should use
 *   `feature-gate.ts` which provides per-user per-feature gating with detailed denial reasons.
 *   The exports below (`checkAiAccess`, `incrementUsage`, `getUsageStatus`, `getTenantAiConfig`)
 *   continue to work as before. Use `checkAiAccessV2`, `incrementUsageV2`, and
 *   `getUsageStatusV2` for the enhanced behavior.
 */

import { sql } from '@/lib/db';
import { getTenantFeatures } from '@/lib/tenant/features';
import {
  checkAiAccess as checkAiAccessV2Impl,
  incrementUsage as incrementUsageV2Impl,
  getUsageStatus as getUsageStatusV2Impl,
} from './feature-gate';
import type { AiTierConfig, AiFeature, AiAccessCheck, AiUsageStatus, AiFeatureKey, AiAccessResult } from './types';

/** Default AI configurations per plan tier */
export const AI_TIER_CONFIGS: Record<string, AiTierConfig> = {
  starter: {
    model: 'claude-haiku-4-5-20250901',
    maxMonthlyUses: 10,
    features: ['coaching'],
  },
  professional: {
    model: 'claude-sonnet-4-20250514',
    maxMonthlyUses: 50,
    features: ['coaching', 'match_insights', 'diff_view', 'project_scoping', 'candidate_screening', 'listing_optimizer', 'talent_discovery'],
  },
  enterprise: {
    model: 'claude-sonnet-4-20250514',
    maxMonthlyUses: -1, // unlimited
    features: [
      'coaching',
      'match_insights',
      'diff_view',
      'project_scoping',
      'candidate_screening',
      'listing_optimizer',
      'talent_discovery',
      'portfolio_intelligence',
      'talent_insights',
    ],
  },
};

/** Get current month key in YYYY-MM format */
function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Get the first day of next month as ISO string */
function getResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Get the merged AI config for a tenant.
 * Reads the plan tier from features JSONB, applies AI_TIER_CONFIGS defaults,
 * then merges any per-tenant aiConfig overrides from features.aiConfig.
 */
export async function getTenantAiConfig(tenantId: string | null): Promise<AiTierConfig> {
  // System admins get enterprise config
  if (!tenantId) {
    return AI_TIER_CONFIGS.enterprise;
  }

  const features = await getTenantFeatures(tenantId);
  const plan = (features.plan as string) || 'starter';
  const baseConfig = AI_TIER_CONFIGS[plan] || AI_TIER_CONFIGS.starter;

  // Check for per-tenant overrides in features.aiConfig
  const overrides = features.aiConfig as Partial<AiTierConfig> | undefined;
  if (!overrides) {
    return baseConfig;
  }

  return {
    model: overrides.model || baseConfig.model,
    maxMonthlyUses: overrides.maxMonthlyUses ?? baseConfig.maxMonthlyUses,
    features: overrides.features || baseConfig.features,
  };
}

/**
 * Check if a tenant has access to a specific AI feature.
 * Verifies: aiCoaching is enabled + feature is in tier + usage limit not exceeded.
 *
 * @deprecated Use `checkAiAccessV2` for per-user gating with detailed denial reasons.
 */
export async function checkAiAccess(
  tenantId: string | null,
  feature: AiFeature
): Promise<AiAccessCheck> {
  // System admins always have access
  if (!tenantId) {
    return { allowed: true, remaining: -1, model: AI_TIER_CONFIGS.enterprise.model };
  }

  const features = await getTenantFeatures(tenantId);

  // Check if AI coaching is enabled for this tenant
  if (!features.aiCoaching) {
    return {
      allowed: false,
      remaining: 0,
      model: '',
      reason: 'AI coaching is not enabled for your institution',
    };
  }

  const config = await getTenantAiConfig(tenantId);

  // Check if the requested feature is in the tier
  if (!config.features.includes(feature)) {
    return {
      allowed: false,
      remaining: 0,
      model: config.model,
      reason: `This feature requires a higher plan tier`,
    };
  }

  // Check usage limits (skip for unlimited)
  if (config.maxMonthlyUses === -1) {
    return { allowed: true, remaining: -1, model: config.model };
  }

  const monthKey = getMonthKey();
  const usage = await sql`
    SELECT usage_count FROM ai_usage_counters
    WHERE tenant_id = ${tenantId} AND month_key = ${monthKey}
  `;

  const used = usage.length > 0 ? (usage[0].usage_count as number) : 0;
  const remaining = config.maxMonthlyUses - used;

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      model: config.model,
      reason: `Monthly AI usage limit reached (${config.maxMonthlyUses} uses). Resets on the 1st.`,
    };
  }

  return { allowed: true, remaining, model: config.model };
}

/**
 * Increment the usage counter for a tenant.
 * Uses upsert to atomically create or increment the counter.
 *
 * @deprecated Use `incrementUsageV2` for per-user per-feature tracking.
 */
export async function incrementUsage(tenantId: string | null): Promise<void> {
  if (!tenantId) return; // System admins don't track usage

  const monthKey = getMonthKey();
  await sql`
    INSERT INTO ai_usage_counters (tenant_id, month_key, usage_count, last_used_at)
    VALUES (${tenantId}, ${monthKey}, 1, NOW())
    ON CONFLICT (tenant_id, month_key)
    DO UPDATE SET usage_count = ai_usage_counters.usage_count + 1, last_used_at = NOW()
  `;
}

/**
 * Get current usage status for a tenant.
 * Used by the UI to display the usage meter.
 *
 * @deprecated Use `getUsageStatusV2` for per-user per-feature status.
 */
export async function getUsageStatus(tenantId: string | null): Promise<AiUsageStatus> {
  if (!tenantId) {
    return {
      used: 0,
      limit: -1,
      remaining: -1,
      resetDate: getResetDate(),
      plan: 'enterprise',
      model: AI_TIER_CONFIGS.enterprise.model,
    };
  }

  const features = await getTenantFeatures(tenantId);
  const plan = (features.plan as string) || 'starter';
  const config = await getTenantAiConfig(tenantId);

  const monthKey = getMonthKey();
  const usage = await sql`
    SELECT usage_count FROM ai_usage_counters
    WHERE tenant_id = ${tenantId} AND month_key = ${monthKey}
  `;

  const used = usage.length > 0 ? (usage[0].usage_count as number) : 0;
  const remaining = config.maxMonthlyUses === -1 ? -1 : Math.max(0, config.maxMonthlyUses - used);

  return {
    used,
    limit: config.maxMonthlyUses,
    remaining,
    resetDate: getResetDate(),
    plan,
    model: config.model,
  };
}

// ---------------------------------------------------------------------------
// V2 wrappers — delegate to feature-gate.ts
// ---------------------------------------------------------------------------

/**
 * Enhanced AI access check with per-user gating and detailed denial reasons.
 * This is the recommended function for all new AI endpoints.
 */
export async function checkAiAccessV2(
  tenantId: string | null,
  userId: string,
  feature: AiFeatureKey,
  action?: string,
): Promise<AiAccessResult> {
  return checkAiAccessV2Impl(tenantId, userId, feature, action);
}

/**
 * Increment per-user per-feature usage counter (v2).
 * Also increments the legacy tenant-level counter for backward compatibility.
 */
export async function incrementUsageV2(
  tenantId: string | null,
  userId: string,
  feature: string,
): Promise<void> {
  return incrementUsageV2Impl(tenantId, userId, feature);
}

/**
 * Get per-user per-feature usage status (v2).
 */
export async function getUsageStatusV2(
  tenantId: string | null,
  userId: string,
  feature: string,
): Promise<{ used: number; limit: number; remaining: number; resetDate: string }> {
  return getUsageStatusV2Impl(tenantId, userId, feature);
}
