'use client';

/**
 * Readiness Tier Progression
 *
 * Pie chart showing the distribution of students across
 * the four readiness tiers: Exploring, Building, Demonstrating, Hire-Ready.
 */

import { ChartCard } from '@/components/analytics/chart-card';

interface ReadinessTierProgressionProps {
  tierDistribution: Record<string, unknown>;
}

/** Tier definitions with labels and target colors */
const TIERS = [
  { name: 'Exploring', range: '0-25', color: '#ef4444' },    // red-500
  { name: 'Building', range: '26-50', color: '#f59e0b' },     // amber-500
  { name: 'Demonstrating', range: '51-75', color: '#14b8a6' }, // teal-500
  { name: 'Hire-Ready', range: '76-100', color: '#10b981' },   // emerald-500
] as const;

export function ReadinessTierProgression({ tierDistribution }: ReadinessTierProgressionProps) {
  // Extract distribution from metadata — the distribution is nested under
  // metadata.distribution when coming from the API summary, or may be the
  // direct object when passed explicitly.
  const dist = (
    tierDistribution && typeof tierDistribution === 'object' && 'distribution' in tierDistribution
      ? (tierDistribution.distribution as Record<string, number>)
      : tierDistribution
  ) as Record<string, number> | undefined;

  const chartData = TIERS.map((tier) => ({
    name: `${tier.name} (${tier.range})`,
    value: typeof dist?.[tier.name] === 'number' ? dist[tier.name] : 0,
    color: tier.color,
  }));

  return (
    <ChartCard
      type="pie"
      title="Readiness Tier Distribution"
      description="Student distribution across readiness levels"
      data={chartData}
      nameKey="name"
      valueKey="value"
    />
  );
}
