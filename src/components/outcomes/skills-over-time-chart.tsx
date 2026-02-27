'use client';

/**
 * Skills Over Time Chart
 *
 * Displays top verified skills as a bar chart alongside
 * readiness score and verified count summary stats.
 */

import { Card, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/analytics/chart-card';
import { Award, ShieldCheck } from 'lucide-react';

interface SkillsOverTimeChartProps {
  topSkills: Array<{ name: string; count: number }>;
  verifiedCount: number;
  avgReadiness: number;
}

export function SkillsOverTimeChart({ topSkills, verifiedCount, avgReadiness }: SkillsOverTimeChartProps) {
  // Convert top skills into chart data
  const chartData = topSkills.map((skill) => ({
    name: skill.name,
    verifications: skill.count,
  }));

  return (
    <div className="space-y-4">
      {/* Summary stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Skills Verified</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{verifiedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Readiness Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round(avgReadiness * 10) / 10}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top skills bar chart */}
      <ChartCard
        type="bar"
        title="Top Verified Skills"
        description="Most frequently verified skills across students"
        data={chartData}
        xKey="name"
        series={[{ key: 'verifications', label: 'Verifications', color: '#059669' }]}
      />
    </div>
  );
}
