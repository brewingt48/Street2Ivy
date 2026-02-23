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
        tooltip="Total number of projects that students have completed during this period. A completed project means the student delivered all required outcomes and the employer confirmed completion."
        trend={comparatives?.total_projects_completed?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Active Students"
        value={Math.round(activationRate * 10) / 10}
        suffix="%"
        icon={Users}
        tooltip="Percentage of enrolled students who have applied to, been accepted for, or completed at least one project. A higher rate means more students are actively building their track record."
        trend={comparatives?.student_activation_rate?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Avg Readiness"
        value={Math.round(avgReadiness * 10) / 10}
        icon={Target}
        tooltip="Average career readiness score (0-100) across all students based on verified skills, completed projects, and employer ratings. Tiers: Exploring (0-25), Building (26-50), Demonstrating (51-75), Hire-Ready (76-100)."
        trend={comparatives?.avg_readiness_score?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Employer Partners"
        value={employerCount}
        icon={Building2}
        tooltip="Number of unique employers and alumni partners who have posted projects, reviewed student work, or actively engaged with the platform during this period."
        trend={comparatives?.employer_engagement_count?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
      <StatCard
        label="Completion Rate"
        value={Math.round(completionRate * 10) / 10}
        suffix="%"
        icon={CheckCircle}
        tooltip="Percentage of accepted projects that were successfully completed. This measures how effectively students follow through on commitments once they begin a project."
        trend={comparatives?.project_completion_rate?.percentChange ?? null}
        trendLabel={comparatives ? 'vs prev period' : undefined}
      />
    </div>
  );
}
