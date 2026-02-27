'use client';

import { ChartCard } from '@/components/analytics/chart-card';

interface GapData {
  skillName: string;
  category: string;
  studentCount: number;
  avgGapSeverity: string;
}

interface InstitutionGapsChartProps {
  gaps: GapData[];
}

export function InstitutionGapsChart({ gaps }: InstitutionGapsChartProps) {
  const chartData = gaps.map((g) => ({
    name: g.skillName,
    students: g.studentCount,
    category: g.category,
  }));

  return (
    <ChartCard
      type="bar"
      title="Top Skill Gaps Across Students"
      description="Most common skill deficiencies by student count"
      data={chartData}
      xKey="name"
      series={[{ key: 'students', label: 'Students with Gap', color: '#ea580c' }]}
      height={350}
    />
  );
}
