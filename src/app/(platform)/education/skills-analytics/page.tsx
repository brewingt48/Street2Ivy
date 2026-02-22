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
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 text-lg mb-2">No Skills Analytics Data Available</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Skills analytics requires student skill gap snapshots to be generated. This happens when students are analyzed against target roles.
            </p>
            <div className="text-left max-w-sm mx-auto space-y-2 text-sm text-slate-500">
              <p className="font-medium text-slate-600">To populate this dashboard:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ensure students have skills on their profiles</li>
                <li>Create target roles with skill requirements</li>
                <li>Run skills gap analysis for your students</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show informative state when data exists but no students/snapshots
  if (data.totalStudents === 0 && data.topGaps.length === 0 && data.topStrengths.length === 0) {
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
        <Card>
          <CardContent className="py-12 text-center">
            <Crosshair className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 text-lg mb-2">No Skills Data Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Skills analytics will populate once students have been analyzed against target roles. This requires skill gap snapshots to be generated.
            </p>
            <div className="text-left max-w-sm mx-auto space-y-2 text-sm text-slate-500">
              <p className="font-medium text-slate-600">To get started:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ensure students have skills listed on their profiles</li>
                <li>Define target roles with required skill sets</li>
                <li>Skills gap analysis will run automatically</li>
              </ol>
            </div>
          </CardContent>
        </Card>
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
      <div>
        <p className="text-sm text-slate-500 mb-3">
          A snapshot of your institution&apos;s workforce readiness. These metrics are computed from student skill profiles compared against target career role requirements.
        </p>
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
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Gap & Readiness Analysis</h2>
        <p className="text-sm text-slate-500 mb-3">
          Identifies the most common skill deficiencies across your student body and shows how students are distributed across readiness tiers (Exploring, Building, Demonstrating, Hire-Ready).
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <InstitutionGapsChart gaps={data.topGaps} />
          <ReadinessDistribution distribution={data.readinessDistribution} />
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Skills Coverage Heatmap</h2>
        <p className="text-sm text-slate-500 mb-3">
          Shows the percentage of students who have each skill as a strength or gap. Green bars represent institutional strengths; red bars highlight skills where students need additional development.
        </p>
      </div>
      <SkillsHeatmap
        strengths={data.topStrengths}
        gaps={data.topGaps}
        totalStudents={data.totalStudents}
      />
    </div>
  );
}
