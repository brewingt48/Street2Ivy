'use client';

/**
 * Executive Summary Cards
 *
 * Row of 5 stat cards displaying top-level outcome metrics
 * for the Outcomes Dashboard.
 */

import { StatCard } from '@/components/analytics/stat-card';
import { Briefcase, Users, Target, Building2, CheckCircle } from 'lucide-react';

interface ExecutiveSummaryCardsProps {
  metrics: Record<string, { value: number; metadata: Record<string, unknown> }>;
  comparatives?: Record<string, { delta: number; percentChange: number }>;
}

export function ExecutiveSummaryCards({ metrics, comparatives }: ExecutiveSummaryCardsProps) {
  const projectsCompleted = metrics.total_projects_completed?.value ?? 0;
  const activationRate = metrics.student_activation_rate?.value ?? 0;
  const avgReadiness = metrics.avg_readiness_score?.value ?? 0;
  const employerCount = metrics.employer_engagement_count?.value ?? 0;
  const completionRate = metrics.project_completion_rate?.value ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="Projects Completed"
        value={projectsCompleted}
        icon={Briefcase}
        trend={comparatives?.total_projects_completed?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Active Students"
        value={Math.round(activationRate * 10) / 10}
        suffix="%"
        icon={Users}
        trend={comparatives?.student_activation_rate?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Avg Readiness"
        value={Math.round(avgReadiness * 10) / 10}
        icon={Target}
        trend={comparatives?.avg_readiness_score?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Employer Partners"
        value={employerCount}
        icon={Building2}
        trend={comparatives?.employer_engagement_count?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Completion Rate"
        value={Math.round(completionRate * 10) / 10}
        suffix="%"
        icon={CheckCircle}
        trend={comparatives?.project_completion_rate?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
    </div>
  );
}
