'use client';

/**
 * Education Admin Analytics Page
 *
 * Comprehensive analytics for education administrators:
 * - Student enrollment, placement rates, GPA
 * - Enrollment timeline, application outcomes
 * - Top skills distribution
 * - Student performance table
 * - Corporate partner activity
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
  GraduationCap,
  Target,
  Award,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalStudents: number;
    placementRate: number;
    avgGPA: number | null;
    activeProjects: number;
    completedProjects: number;
    waitlistPending: number;
  };
  enrollmentTimeline: { date: string; newStudents: number }[];
  applicationsByStatus: { status: string; count: number }[];
  topSkills: { skill: string; studentCount: number }[];
  studentPerformance: {
    id: string;
    name: string;
    email: string;
    university: string | null;
    gpa: string | null;
    applications: number;
    accepted: number;
    completed: number;
  }[];
  corporatePartnerActivity: {
    name: string;
    listings: number;
    studentsHired: number;
  }[];
}

export default function EducationAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/education/analytics?range=${range}`);
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

  const enrollmentData = data.enrollmentTimeline.map((t) => ({
    ...t,
    date: formatChartDate(t.date, range),
  }));

  const skillsData = data.topSkills.map((s) => ({
    skill: s.skill,
    students: s.studentCount,
  }));

  const studentColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'university', label: 'University', sortable: true, format: (v) => (v as string) || '-' },
    { key: 'gpa', label: 'GPA', sortable: true, align: 'right', format: (v) => (v as string) || '-' },
    { key: 'applications', label: 'Apps', sortable: true, align: 'right' },
    { key: 'accepted', label: 'Accepted', sortable: true, align: 'right' },
    { key: 'completed', label: 'Completed', sortable: true, align: 'right' },
  ];

  const corpColumns: TableColumn[] = [
    { key: 'name', label: 'Company', sortable: true },
    { key: 'listings', label: 'Listings', sortable: true, align: 'right' },
    { key: 'studentsHired', label: 'Students Hired', sortable: true, align: 'right' },
  ];

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Institution Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track student outcomes, placement rates, and program performance
            </p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Students"
          value={data.summary.totalStudents}
          icon={GraduationCap}
          href="/education/students"
        />
        <StatCard
          label="Placement Rate"
          value={`${data.summary.placementRate}%`}
          icon={Target}
        />
        <StatCard
          label="Average GPA"
          value={data.summary.avgGPA !== null ? data.summary.avgGPA.toFixed(2) : 'N/A'}
          icon={Award}
        />
        <StatCard
          label="Active Projects"
          value={data.summary.activeProjects}
          icon={Briefcase}
        />
        <StatCard
          label="Completed Projects"
          value={data.summary.completedProjects}
          icon={CheckCircle2}
        />
        <StatCard
          label="Waitlist Pending"
          value={data.summary.waitlistPending}
          icon={ClipboardList}
          href="/education/waitlist"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          type="line"
          title="Student Enrollment"
          description="New student registrations over time"
          data={enrollmentData}
          xKey="date"
          series={[{ key: 'newStudents', label: 'New Students', color: '#0d9488' }]}
        />
        <ChartCard
          type="pie"
          title="Application Outcomes"
          description="How student applications are resolved"
          data={data.applicationsByStatus}
          nameKey="status"
          valueKey="count"
        />
      </div>

      {/* Skills Distribution */}
      {skillsData.length > 0 && (
        <ChartCard
          type="bar"
          title="Top Skills Among Students"
          description="Most common skills in your student body"
          data={skillsData}
          xKey="skill"
          series={[{ key: 'students', label: 'Students' }]}
          height={250}
        />
      )}

      {/* Student Performance Table */}
      <DataTable
        title="Student Performance"
        data={data.studentPerformance as unknown as Record<string, unknown>[]}
        columns={studentColumns}
        exportFilename={`student-performance-${range}`}
        pageSize={15}
      />

      {/* Corporate Partner Activity */}
      {data.corporatePartnerActivity.length > 0 && (
        <DataTable
          title="Corporate Partner Activity"
          data={data.corporatePartnerActivity as unknown as Record<string, unknown>[]}
          columns={corpColumns}
          exportFilename={`corporate-partners-${range}`}
          pageSize={10}
        />
      )}
    </div>
  );
}
