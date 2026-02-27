'use client';

/**
 * Engagement Funnel
 *
 * Displays student engagement distribution as a horizontal bar chart,
 * showing how many students fall into each project-completion bucket.
 */

import { Card, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/analytics/chart-card';
import { Users } from 'lucide-react';

interface EngagementFunnelProps {
  distribution: Record<string, unknown>;
  activationRate: number;
}

/** Canonical bucket order for the engagement histogram */
const BUCKET_ORDER = [
  '0 projects',
  '1 project',
  '2-3 projects',
  '4-5 projects',
  '6+ projects',
];

export function EngagementFunnel({ distribution, activationRate }: EngagementFunnelProps) {
  // Convert distribution object into ordered chart data
  const chartData = BUCKET_ORDER.map((bucket) => ({
    name: bucket,
    students: typeof distribution[bucket] === 'number' ? (distribution[bucket] as number) : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Activation rate stat */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Student Activation Rate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(activationRate * 10) / 10}
                <span className="text-base font-normal text-slate-400 ml-1">%</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement distribution bar chart */}
      <ChartCard
        type="bar"
        title="Student Engagement Distribution"
        description="Number of students by completed project count"
        data={chartData}
        xKey="name"
        series={[{ key: 'students', label: 'Students', color: '#0d9488' }]}
      />
    </div>
  );
}
