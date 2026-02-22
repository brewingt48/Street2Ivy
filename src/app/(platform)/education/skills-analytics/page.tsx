'use client';

/**
 * Education Admin Skills Analytics Page
 *
 * Institution-wide skills gap analytics with distribution, heatmap, and drill-down.
 * Supports filtering by target career role (profession) to see student readiness
 * for specific career paths.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstitutionGapsChart } from '@/components/skills-gap/institution-gaps-chart';
import { ReadinessDistribution } from '@/components/skills-gap/readiness-distribution';
import { SkillsHeatmap } from '@/components/skills-gap/skills-heatmap';
import { Crosshair, Users, TrendingUp, AlertTriangle, CheckCircle2, Briefcase, Info } from 'lucide-react';

interface TargetRole {
  id: string;
  title: string;
  skillCount: number;
}

interface AnalyticsData {
  totalStudents: number;
  averageReadiness: number;
  readinessDistribution: Array<{ tier: string; count: number; percentage: number }>;
  topGaps: Array<{ skillName: string; category: string; studentCount: number; avgGapSeverity: string }>;
  topStrengths: Array<{ skillName: string; category: string; studentCount: number; avgLevel: number }>;
  targetRoles: TargetRole[];
}

export default function SkillsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole) params.set('targetRoleId', selectedRole);
      const res = await fetch(`/api/education/skills-analytics?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load skills analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

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

  const selectedRoleTitle = selectedRole
    ? data.targetRoles.find((r) => r.id === selectedRole)?.title
    : null;

  const statCards = [
    {
      label: 'Total Students',
      value: data.totalStudents,
      icon: Users,
      color: 'text-teal-600',
    },
    {
      label: selectedRoleTitle ? `Avg Readiness (${selectedRoleTitle})` : 'Avg Readiness',
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
          Institution-wide skills gap analysis and readiness metrics.
          {selectedRoleTitle && <> Filtered by: <strong className="text-slate-700">{selectedRoleTitle}</strong></>}
        </p>
      </div>

      {/* Profession Filter */}
      {data.targetRoles.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-slate-700">Filter by Profession:</span>
              </div>
              <Select
                value={selectedRole || '__all__'}
                onValueChange={(v) => setSelectedRole(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-64 h-9">
                  <SelectValue placeholder="All Professions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Professions (Overall)</SelectItem>
                  {data.targetRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.title} ({role.skillCount} skills)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <button
                  onClick={() => setSelectedRole('')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How Professions Are Measured */}
      <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-slate-800 dark:text-white mb-1">How Professions Are Measured</p>
              <p className="text-slate-600 dark:text-slate-300">
                Professions shown here are <strong>target career roles</strong> — curated positions with specifically defined skill requirements.
                Each target role lists the skills and proficiency levels needed for that career path. Student readiness is measured by comparing
                their verified skill profiles against these defined requirements. This is the same methodology used for the{' '}
                <strong>Skills Gap Assessment</strong>. Professions are not randomly selected — they are intentionally configured by your
                institution or provided as industry-standard benchmarks.
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
                Readiness tiers: Exploring (0-25%), Building (26-50%), Demonstrating (51-75%), Hire-Ready (76-100%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Gap & Readiness Analysis
          {selectedRoleTitle && <span className="text-sm font-normal text-slate-500 ml-2">for {selectedRoleTitle}</span>}
        </h2>
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
