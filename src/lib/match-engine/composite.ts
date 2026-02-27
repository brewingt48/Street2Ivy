/**
 * ProveGround Match Engine™ — Composite Scorer
 *
 * Aggregates all 6 signal scores into a single composite score
 * using configurable weights.
 */

import type {
  SignalResult,
  SignalWeights,
  SignalName,
  CompositeScore,
} from './types';
import { ENGINE_VERSION } from './config';

/**
 * Compute the weighted composite score from individual signals.
 *
 * @param signals - Array of signal results (one per signal)
 * @param weights - Signal weights (must sum to ~1.0)
 * @returns CompositeScore with overall score and per-signal breakdown
 */
export function computeCompositeScore(
  signals: SignalResult[],
  weights: SignalWeights
): CompositeScore {
  const signalMap = new Map(signals.map((s) => [s.signal, s]));
  const allSignals: SignalName[] = [
    'temporal',
    'skills',
    'sustainability',
    'growth',
    'trust',
    'network',
  ];

  let weightedSum = 0;
  const breakdown: CompositeScore['signals'] = {} as CompositeScore['signals'];

  for (const name of allSignals) {
    const result = signalMap.get(name);
    const weight = weights[name] || 0;
    const score = result?.score ?? 50; // default to 50 if signal not computed

    weightedSum += score * weight;

    breakdown[name] = {
      score,
      weight,
      details: result?.details || {},
    };
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, weightedSum))),
    signals: breakdown,
    computedAt: new Date().toISOString(),
    version: ENGINE_VERSION,
  };
}

/**
 * Quick composite score for sorting — skips building the full breakdown.
 */
export function computeQuickScore(
  signals: SignalResult[],
  weights: SignalWeights
): number {
  let weightedSum = 0;
  const signalMap = new Map(signals.map((s) => [s.signal, s]));

  for (const name of Object.keys(weights) as SignalName[]) {
    const result = signalMap.get(name);
    weightedSum += (result?.score ?? 50) * (weights[name] || 0);
  }

  return Math.round(Math.min(100, Math.max(0, weightedSum)));
}
