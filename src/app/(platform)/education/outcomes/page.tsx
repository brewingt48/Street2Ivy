'use client';

/**
 * Outcomes Dashboard Page
 *
 * Comprehensive view of institutional outcome metrics:
 * - Executive summary stat cards
 * - Engagement funnel and readiness tier distribution
 * - Skills verification chart
 * - Employer impact section
 * - Handshake correlation placeholder
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/analytics/date-range-picker';
import { getDateRange, type RangeKey } from '@/lib/analytics/date-ranges';
import { LineChart as LineChartIcon, ArrowLeft, Link2 } from 'lucide-react';
import { ExecutiveSummaryCards } from '@/components/outcomes/executive-summary-cards';
import { EngagementFunnel } from '@/components/outcomes/engagement-funnel';
import { SkillsOverTimeChart } from '@/components/outcomes/skills-over-time-chart';
import { ReadinessTierProgression } from '@/components/outcomes/readiness-tier-progression';
import { EmployerImpactSection } from '@/components/outcomes/employer-impact-section';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricsSummary {
  institutionId: string;
  periodStart: string;
  periodEnd: string;
  cohortFilter: string | null;
  computedAt: string;
  metrics: Record<string, { value: number; metadata: Record<string, unknown> }>;
}

interface EmployerApiResponse {
  periodStart: string;
  periodEnd: string;
  cohortFilter: string | null;
  metrics: Record<string, { value: number; metadata: Record<string, unknown> }>;
  topEmployers: Array<{
    id: string;
    displayName: string;
    companyName: string;
    listingCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OutcomesDashboardPage() {
  const [range, setRange] = useState<RangeKey>('90d');
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [employerData, setEmployerData] = useState<EmployerApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(range);
      const params = new URLSearchParams({ periodStart: start, periodEnd: end });

      const [metricsRes, employerRes] = await Promise.all([
        fetch(`/api/education/outcomes?${params}`),
        fetch(`/api/education/outcomes/employers?${params}`),
      ]);

      if (metricsRes.ok) {
        const metricsJson: MetricsSummary = await metricsRes.json();
        setMetrics(metricsJson);
      }

      if (employerRes.ok) {
        const employerJson: EmployerApiResponse = await employerRes.json();
        setEmployerData(employerJson);
      }
    } catch (err) {
      console.error('Failed to load outcomes data:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------

  const m = metrics?.metrics ?? {};

  // Engagement funnel data
  const engagementDistribution = (m.engagement_distribution?.metadata?.distribution ?? {}) as Record<
    string,
    unknown
  >;
  const activationRate = m.student_activation_rate?.value ?? 0;

  // Skills data
  const topSkillsRaw = (m.top_skills_verified?.metadata?.skills ?? []) as Array<{
    skill: string;
    count: number;
  }>;
  const topSkills = topSkillsRaw.map((s) => ({ name: s.skill, count: s.count }));
  const verifiedCount = m.skills_verified_count?.value ?? 0;
  const avgReadiness = m.avg_readiness_score?.value ?? 0;

  // Readiness tier data
  const tierDistribution = (m.readiness_tier_distribution?.metadata ?? {}) as Record<string, unknown>;

  // Employer data
  const engagementCount = m.employer_engagement_count?.value ?? 0;
  const satisfactionAvg = m.employer_satisfaction_avg?.value ?? 0;
  const repeatRate = m.repeat_employer_rate?.value ?? 0;

  // Map API employer response to component props
  const topEmployers = employerData?.topEmployers?.map((e) => ({
    company_name: e.companyName || '',
    first_name: e.displayName?.split(' ')[0] || '',
    last_name: e.displayName?.split(' ').slice(1).join(' ') || '',
    listing_count: e.listingCount,
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/education">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Outcomes Dashboard
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Track student outcomes, skill development, and employer engagement
            </p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Executive Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Executive Summary</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          High-level metrics showing overall program performance: total completed projects, percentage of students actively engaged, average career readiness score, employer participation, and project completion rates.
        </p>
        <ExecutiveSummaryCards metrics={m} />
      </div>

      {/* Engagement + Readiness Tier (2-col grid) */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Engagement &amp; Readiness</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Student engagement shows how many projects students have completed (activation rate). Readiness tiers categorize students from Exploring (early stage) to Hire-Ready based on their verified skills relative to career requirements.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EngagementFunnel
            distribution={engagementDistribution}
            activationRate={activationRate}
          />
          <ReadinessTierProgression tierDistribution={tierDistribution} />
        </div>
      </div>

      {/* Skills Over Time */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Skills Development</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Tracks which skills students are developing through Proveground projects. Verified skills are confirmed through project completion, not self-reported. Shows the most in-demand skills across your student body.
        </p>
        <SkillsOverTimeChart
          topSkills={topSkills}
          verifiedCount={verifiedCount}
          avgReadiness={avgReadiness}
        />
      </div>

      {/* Employer Impact */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Employer Impact</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Measures employer participation and satisfaction. Tracks how many corporate partners are posting projects, their average satisfaction ratings, and the rate at which employers return for additional projects.
        </p>
        <EmployerImpactSection
          engagementCount={engagementCount}
          satisfactionAvg={satisfactionAvg}
          repeatRate={repeatRate}
          topEmployers={topEmployers}
        />
      </div>

      {/* Handshake Correlation Placeholder */}
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <Link2 className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Handshake Correlation
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Connect Handshake for career outcome correlations
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
