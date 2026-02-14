'use client';

/**
 * Student Analytics Page
 *
 * Comprehensive analytics dashboard for students:
 * - Summary stat cards with trends
 * - Application timeline chart
 * - Status breakdown pie chart
 * - Top skills bar chart
 * - Full applications table with export
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/analytics/date-range-picker';
import { StatCard } from '@/components/analytics/stat-card';
import { ChartCard } from '@/components/analytics/chart-card';
import { DataTable, type TableColumn } from '@/components/analytics/data-table';
import { formatChartDate, type RangeKey } from '@/lib/analytics/date-ranges';
import {
  FileText,
  CheckCircle2,
  Clock,
  Award,
  User,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalApplications: number;
    acceptanceRate: number;
    avgResponseTime: number | null;
    completedProjects: number;
    pendingApplications: number;
    profileCompleteness: number;
    skillCount: number;
  };
  applicationsByStatus: { status: string; count: number }[];
  applicationTimeline: { date: string; submitted: number; accepted: number }[];
  topSkillMatches: { skill: string; matchCount: number }[];
  allApplications: {
    id: string;
    listingTitle: string;
    corporateName: string;
    status: string;
    submittedAt: string;
    respondedAt: string | null;
    completedAt: string | null;
    category: string | null;
    compensation: string | null;
  }[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-slate-100 text-slate-600',
};

export default function StudentAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/analytics?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const timelineData = data.applicationTimeline.map((t) => ({
    ...t,
    date: formatChartDate(t.date, range),
  }));

  const skillsChartData = data.topSkillMatches.map((s) => ({
    skill: s.skill,
    applications: s.matchCount,
  }));

  const appColumns: TableColumn[] = [
    {
      key: 'listingTitle',
      label: 'Project',
      sortable: true,
    },
    {
      key: 'corporateName',
      label: 'Company',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      format: (val) => val as string,
      className: 'capitalize',
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      format: (val) => (val as string) || '-',
    },
    {
      key: 'submittedAt',
      label: 'Applied',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : '-',
    },
    {
      key: 'respondedAt',
      label: 'Response',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : 'Pending',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              My Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track your application performance and career progress
            </p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Applications"
          value={data.summary.totalApplications}
          icon={FileText}
          href="/applications"
        />
        <StatCard
          label="Acceptance Rate"
          value={`${data.summary.acceptanceRate}%`}
          icon={CheckCircle2}
          href="/applications"
        />
        <StatCard
          label="Avg Response Time"
          value={data.summary.avgResponseTime !== null ? `${data.summary.avgResponseTime}` : 'N/A'}
          suffix={data.summary.avgResponseTime !== null ? 'days' : undefined}
          icon={Clock}
        />
        <StatCard
          label="Completed Projects"
          value={data.summary.completedProjects}
          icon={Award}
          href="/applications"
        />
        <StatCard
          label="Profile Completeness"
          value={`${data.summary.profileCompleteness}%`}
          icon={User}
          href="/settings"
        />
        <StatCard
          label="Skills Listed"
          value={data.summary.skillCount}
          icon={Zap}
          href="/settings"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          type="line"
          title="Application Activity"
          description="Applications submitted and accepted over time"
          data={timelineData}
          xKey="date"
          series={[
            { key: 'submitted', label: 'Submitted', color: '#0d9488' },
            { key: 'accepted', label: 'Accepted', color: '#0284c7' },
          ]}
        />
        <ChartCard
          type="pie"
          title="Applications by Status"
          description="Breakdown of all application outcomes"
          data={data.applicationsByStatus}
          nameKey="status"
          valueKey="count"
        />
      </div>

      {/* Skills Chart */}
      {skillsChartData.length > 0 && (
        <ChartCard
          type="bar"
          title="Top Skills Used"
          description="Your skills most associated with applications"
          data={skillsChartData}
          xKey="skill"
          series={[{ key: 'applications', label: 'Applications' }]}
          height={250}
        />
      )}

      {/* Full Applications Table */}
      <DataTable
        title="All Applications"
        data={data.allApplications as unknown as Record<string, unknown>[]}
        columns={appColumns}
        exportFilename={`my-applications-${range}`}
        pageSize={10}
      />
    </div>
  );
}
