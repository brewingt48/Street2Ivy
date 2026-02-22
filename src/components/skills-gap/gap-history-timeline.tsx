'use client';

import { ChartCard } from '@/components/analytics/chart-card';

interface Snapshot {
  overall_readiness_score: string | number;
  snapshot_date: string;
  target_role_title: string;
}

interface GapHistoryTimelineProps {
  snapshots: Snapshot[];
}

export function GapHistoryTimeline({ snapshots }: GapHistoryTimelineProps) {
  const chartData = snapshots
    .slice()
    .reverse()
    .map((s) => ({
      date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Number(s.overall_readiness_score),
    }));

  return (
    <ChartCard
      type="line"
      title="Readiness Score Over Time"
      description="Track your progress across analyses"
      data={chartData}
      xKey="date"
      series={[{ key: 'score', label: 'Readiness Score', color: '#0d9488' }]}
      height={250}
    />
  );
}
