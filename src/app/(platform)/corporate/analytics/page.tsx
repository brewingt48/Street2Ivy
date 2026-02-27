'use client';

/**
 * Corporate Analytics Page
 *
 * Comprehensive analytics for corporate partners:
 * - Summary stats with key metrics
 * - Application funnel chart
 * - Application timeline
 * - Listing performance table
 * - All applications table with export
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/analytics/date-range-picker';
import { StatCard } from '@/components/analytics/stat-card';
import { ChartCard } from '@/components/analytics/chart-card';
import { DataTable, type TableColumn } from '@/components/analytics/data-table';
import { formatChartDate, type RangeKey } from '@/lib/analytics/date-ranges';
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  UserCheck,
  Users,
  ArrowLeft,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    activeListings: number;
    totalApplications: number;
    avgTimeToFill: number | null;
    completionRate: number;
    inviteAcceptRate: number;
    avgApplicantsPerListing: number;
  };
  applicationFunnel: { stage: string; count: number }[];
  applicationTimeline: { date: string; received: number; accepted: number }[];
  listingPerformance: {
    id: string;
    title: string;
    status: string;
    publishedAt: string | null;
    applicants: number;
    accepted: number;
    completed: number;
  }[];
  topRequestedSkills: { skill: string; count: number }[];
  allApplications: {
    id: string;
    studentName: string;
    studentEmail: string;
    status: string;
    listingTitle: string;
    submittedAt: string;
    respondedAt: string | null;
    completedAt: string | null;
    gpa: string | null;
    category: string | null;
    compensation: string | null;
  }[];
}

export default function CorporateAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/corporate/analytics?range=${range}`);
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
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)}
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

  const funnelData = data.applicationFunnel.map((f) => ({
    stage: f.stage,
    count: f.count,
  }));

  const skillsData = data.topRequestedSkills.map((s) => ({
    skill: s.skill,
    listings: s.count,
  }));

  const listingColumns: TableColumn[] = [
    { key: 'title', label: 'Listing', sortable: true },
    { key: 'status', label: 'Status', sortable: true, className: 'capitalize' },
    { key: 'applicants', label: 'Applicants', sortable: true, align: 'right' },
    { key: 'accepted', label: 'Accepted', sortable: true, align: 'right' },
    { key: 'completed', label: 'Completed', sortable: true, align: 'right' },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : 'Draft',
    },
  ];

  const appColumns: TableColumn[] = [
    { key: 'studentName', label: 'Student', sortable: true },
    { key: 'listingTitle', label: 'Project', sortable: true },
    { key: 'status', label: 'Status', sortable: true, className: 'capitalize' },
    { key: 'gpa', label: 'GPA', sortable: true, align: 'right', format: (v) => (v as string) || '-' },
    {
      key: 'submittedAt',
      label: 'Applied',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : '-',
    },
    {
      key: 'respondedAt',
      label: 'Responded',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : 'Pending',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/corporate">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Hiring Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track listing performance, application pipeline, and hiring outcomes
            </p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary Stats */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Your hiring pipeline at a glance. Active Listings counts published projects, Avg Time to Fill measures days from posting to acceptance, Completion Rate tracks what percentage of accepted students finish the project, and Invite Accept Rate shows how often students accept your direct invitations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Active Listings"
            value={data.summary.activeListings}
            icon={Briefcase}
            href="/corporate/projects"
          />
          <StatCard
            label="Total Applications"
            value={data.summary.totalApplications}
            icon={FileText}
            href="/corporate/applications"
          />
          <StatCard
            label="Avg Time to Fill"
            value={data.summary.avgTimeToFill !== null ? `${data.summary.avgTimeToFill}` : 'N/A'}
            suffix={data.summary.avgTimeToFill !== null ? 'days' : undefined}
            icon={Clock}
          />
          <StatCard
            label="Completion Rate"
            value={`${data.summary.completionRate}%`}
            icon={CheckCircle2}
          />
          <StatCard
            label="Invite Accept Rate"
            value={`${data.summary.inviteAcceptRate}%`}
            icon={UserCheck}
          />
          <StatCard
            label="Avg Applicants / Listing"
            value={data.summary.avgApplicantsPerListing}
            icon={Users}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Pipeline Analysis</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          The Application Funnel shows how applications progress from submission through acceptance to project completion. Application Activity tracks incoming and accepted applications over your selected time period.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            type="bar"
            title="Application Funnel"
            description="Application pipeline from submission to completion"
            data={funnelData}
            xKey="stage"
            series={[{ key: 'count', label: 'Applications', color: '#0d9488' }]}
          />
          <ChartCard
            type="line"
            title="Application Activity"
            description="Applications received and accepted over time"
            data={timelineData}
            xKey="date"
            series={[
              { key: 'received', label: 'Received', color: '#0d9488' },
              { key: 'accepted', label: 'Accepted', color: '#0284c7' },
            ]}
          />
        </div>
      </div>

      {/* Top Skills */}
      {skillsData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Skills Demand</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Shows the skills you&apos;ve listed most frequently across your project postings. This helps you understand your hiring patterns and the talent profile you&apos;re seeking.
          </p>
          <ChartCard
            type="bar"
            title="Most Requested Skills"
            description="Skills you've listed across your projects"
            data={skillsData}
            xKey="skill"
            series={[{ key: 'listings', label: 'Listings' }]}
            height={250}
          />
        </div>
      )}

      {/* Listing Performance Table */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Listing Performance</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Performance breakdown for each of your project listings, including how many applicants each received, how many were accepted, and how many completed the project.
        </p>
        <DataTable
          title="Listing Performance"
          data={data.listingPerformance as unknown as Record<string, unknown>[]}
          columns={listingColumns}
          exportFilename={`listing-performance-${range}`}
          pageSize={10}
        />
      </div>

      {/* All Applications Table */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">All Applications</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Complete record of all applications received across your listings. Sort by any column and export the data for offline analysis.
        </p>
        <DataTable
          title="All Applications"
          data={data.allApplications as unknown as Record<string, unknown>[]}
          columns={appColumns}
          exportFilename={`applications-received-${range}`}
          pageSize={10}
        />
      </div>
    </div>
  );
}
