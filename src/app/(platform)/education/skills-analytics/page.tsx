'use client';

/**
 * Education Admin Skills Analytics Page
 *
 * Institution-wide skills gap analytics with distribution, heatmap, and drill-down.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InstitutionGapsChart } from '@/components/skills-gap/institution-gaps-chart';
import { ReadinessDistribution } from '@/components/skills-gap/readiness-distribution';
import { SkillsHeatmap } from '@/components/skills-gap/skills-heatmap';
import { Crosshair, Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AnalyticsData {
  totalStudents: number;
  averageReadiness: number;
  readinessDistribution: Array<{ tier: string; count: number; percentage: number }>;
  topGaps: Array<{ skillName: string; category: string; studentCount: number; avgGapSeverity: string }>;
  topStrengths: Array<{ skillName: string; category: string; studentCount: number; avgLevel: number }>;
}

export default function SkillsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education/skills-analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load skills analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Skills Analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>Unable to load skills analytics data.</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Students',
      value: data.totalStudents,
      icon: Users,
      color: 'text-teal-600',
    },
    {
      label: 'Avg Readiness',
      value: `${data.averageReadiness}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      label: 'Critical Gaps',
      value: data.topGaps.filter((g) => g.avgGapSeverity === 'critical').length,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      label: 'Top Strengths',
      value: data.topStrengths.length,
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Crosshair className="h-6 w-6 text-teal-600" />
          Skills Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Institution-wide skills gap analysis and readiness metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InstitutionGapsChart gaps={data.topGaps} />
        <ReadinessDistribution distribution={data.readinessDistribution} />
      </div>

      {/* Heatmap */}
      <SkillsHeatmap
        strengths={data.topStrengths}
        gaps={data.topGaps}
        totalStudents={data.totalStudents}
      />
    </div>
  );
}
