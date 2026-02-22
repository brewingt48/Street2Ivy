'use client';

import { ChartCard } from '@/components/analytics/chart-card';

interface TierData {
  tier: string;
  count: number;
  percentage: number;
}

interface ReadinessDistributionProps {
  distribution: TierData[];
}

export function ReadinessDistribution({ distribution }: ReadinessDistributionProps) {
  const chartData = distribution.map((d) => ({
    name: d.tier,
    value: d.count,
  }));

  return (
    <ChartCard
      type="pie"
      title="Student Readiness Distribution"
      description="Students across readiness tiers"
      data={chartData}
      nameKey="name"
      valueKey="value"
      height={300}
    />
  );
}
