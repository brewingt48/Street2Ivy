/**
 * ProveGround Match Engine™ — Configuration
 *
 * Default signal weights, tier configs, and thresholds.
 */

import type { SignalWeights, MatchEngineConfigData } from './types';

/** Current engine version — increment on scoring algorithm changes to invalidate cache */
export const ENGINE_VERSION = 1;

/** Default signal weights (must sum to 1.0) */
export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  temporal: 0.25,
  skills: 0.30,
  sustainability: 0.15,
  growth: 0.10,
  trust: 0.10,
  network: 0.10,
};

/** Default engine config */
export const DEFAULT_CONFIG: MatchEngineConfigData = {
  signalWeights: DEFAULT_SIGNAL_WEIGHTS,
  minScoreThreshold: 20,
  maxResultsPerQuery: 50,
  enableAthleticTransfer: true,
  enableScheduleMatching: true,
  staleThresholdHours: 24,
  batchSize: 50,
};

/** Tier-specific overrides */
export const TIER_CONFIGS: Record<string, Partial<MatchEngineConfigData>> = {
  starter: {
    // Starter uses the old matching engine — no access to new signals
    enableAthleticTransfer: false,
    enableScheduleMatching: false,
    maxResultsPerQuery: 10,
  },
  professional: {
    enableAthleticTransfer: true,
    enableScheduleMatching: true,
    maxResultsPerQuery: 50,
  },
  enterprise: {
    enableAthleticTransfer: true,
    enableScheduleMatching: true,
    maxResultsPerQuery: 100,
  },
};

/**
 * Get the resolved config for a tenant, merging tier defaults with tenant overrides.
 */
export function resolveConfig(
  tierName: string,
  tenantOverrides?: Partial<MatchEngineConfigData>
): MatchEngineConfigData {
  const tierConfig = TIER_CONFIGS[tierName] || {};
  return {
    ...DEFAULT_CONFIG,
    ...tierConfig,
    ...(tenantOverrides || {}),
    signalWeights: {
      ...DEFAULT_CONFIG.signalWeights,
      ...(tierConfig.signalWeights || {}),
      ...(tenantOverrides?.signalWeights || {}),
    },
  };
}

/**
 * Validate that signal weights sum to approximately 1.0
 */
export function validateWeights(weights: SignalWeights): boolean {
  const sum =
    weights.temporal +
    weights.skills +
    weights.sustainability +
    weights.growth +
    weights.trust +
    weights.network;
  return Math.abs(sum - 1.0) < 0.01;
}
