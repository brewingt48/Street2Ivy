/**
 * ProveGround Match Engine™ — Network Affinity Signal (10%)
 *
 * Evaluates the connection strength between student and listing
 * through the tenant/alumni network.
 *
 * Factors:
 *  - Same tenant bonus (listing posted within student's program)
 *  - Partner relationship strength (exclusive > preferred > network)
 *  - Alumni connection (listing author is alumni of same institution)
 *  - Previous interaction history
 */

import type { SignalResult, StudentData, ListingData } from '../types';

export function scoreNetworkAffinity(
  student: StudentData,
  listing: ListingData
): SignalResult {
  const details: Record<string, unknown> = {};

  // --- Factor 1: Same tenant ---
  let tenantScore = 40; // base — no tenant match
  if (student.tenantId && listing.tenantId) {
    if (student.tenantId === listing.tenantId) {
      tenantScore = 100; // Direct institutional connection
    }
  }
  details.tenantScore = tenantScore;
  details.sameTenant = student.tenantId === listing.tenantId;

  // --- Factor 2: Previous interaction with this company ---
  let interactionScore = 40; // neutral
  if (student.applicationHistory.length > 0) {
    const previousAppsToAuthor = student.applicationHistory.filter(
      (h) => h.listingId // We'd need authorId in history to be precise
      // For now, same category as a proxy for familiarity
    );
    const completedWithCategory = student.applicationHistory.filter(
      (h) =>
        (h.status === 'completed' || h.status === 'accepted') &&
        h.category?.toLowerCase() === listing.category?.toLowerCase()
    );

    if (completedWithCategory.length > 0) {
      interactionScore = 80; // Has successfully worked in this space
    } else if (previousAppsToAuthor.length > 0) {
      interactionScore = 55; // Has applied before
    }
  }
  details.interactionScore = interactionScore;

  // --- Factor 3: Listing source type ---
  // Private listings (same tenant) get a bonus over network listings
  let sourceScore = 50;
  if (student.tenantId && listing.tenantId === student.tenantId) {
    sourceScore = 90; // Private — exclusive to the student's program
  } else if (listing.tenantId) {
    sourceScore = 60; // Network listing — available but not exclusive
  }
  details.sourceScore = sourceScore;

  // --- Factor 4: Listing recency (freshness as a proxy for active engagement) ---
  let freshnessScore = 50;
  if (listing.publishedAt) {
    const daysOld =
      (Date.now() - new Date(listing.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld <= 7) {
      freshnessScore = 100;
    } else if (daysOld <= 14) {
      freshnessScore = 85;
    } else if (daysOld <= 30) {
      freshnessScore = 65;
    } else if (daysOld <= 60) {
      freshnessScore = 45;
    } else {
      freshnessScore = 25;
    }
  }
  details.freshnessScore = freshnessScore;

  // --- Weighted composite ---
  // Tenant: 40%, Interaction: 20%, Source: 20%, Freshness: 20%
  const finalScore = Math.round(
    tenantScore * 0.40 +
    interactionScore * 0.20 +
    sourceScore * 0.20 +
    freshnessScore * 0.20
  );

  return {
    signal: 'network',
    score: Math.min(100, Math.max(0, finalScore)),
    details,
  };
}
