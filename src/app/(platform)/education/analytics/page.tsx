'use client';

/**
 * Education Admin Analytics Page
 *
 * Comprehensive analytics for education administrators:
 * - Student enrollment, placement rates
 * - Enrollment timeline, application outcomes
 * - Student activity table
 * - Corporate partner activity
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Briefcase,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalStudents: number;
    placementRate: number;
    avgGPA: number | null;
    activeProjects: number;
    completedProjects: number;
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
  const router = useRouter();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}
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

  const studentColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'university', label: 'University', sortable: true, format: (v) => (v as string) || '-' },
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
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Key performance indicators for your institution. Total Students counts enrolled students, Placement Rate tracks the percentage who have been accepted into projects, and Active/Completed Projects measure current and past project participation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            label="Active Projects"
            value={data.summary.activeProjects}
            icon={Briefcase}
          />
          <StatCard
            label="Completed Projects"
            value={data.summary.completedProjects}
            icon={CheckCircle2}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Trends</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Student Enrollment tracks new registrations over the selected time period. Application Outcomes shows how student applications have been resolved (pending, accepted, rejected, completed).
        </p>
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
      </div>

      {/* Student Activity Table */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Student Activity</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Individual student performance showing application counts, acceptance rates, and project completions. Use this to identify high-performing students and those who may need additional support.
        </p>
        <DataTable
          title="Student Activity"
          data={data.studentPerformance as unknown as Record<string, unknown>[]}
          columns={studentColumns}
          exportFilename={`student-performance-${range}`}
          pageSize={15}
          searchable
          searchPlaceholder="Search students by name, email, or university..."
          searchKeys={['name', 'email', 'university']}
          onRowClick={(row) => router.push(`/education/students?q=${encodeURIComponent(row.email as string)}`)}
          renderCell={(col, value, row) => {
            if (col.key === 'name') {
              return (
                <Link
                  href={`/education/students?q=${encodeURIComponent(row.email as string)}`}
                  className="text-sm font-medium text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {value as string}
                </Link>
              );
            }
            return undefined;
          }}
        />
      </div>

      {/* Corporate Partner Activity */}
      {data.corporatePartnerActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">Corporate Partner Activity</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Shows which corporate partners are most active on the platform, including how many project listings they have posted and how many students they have hired.
          </p>
          <DataTable
            title="Corporate Partner Activity"
            data={data.corporatePartnerActivity as unknown as Record<string, unknown>[]}
            columns={corpColumns}
            exportFilename={`corporate-partners-${range}`}
            pageSize={10}
            searchable
            searchPlaceholder="Search partners..."
            searchKeys={['name']}
          />
        </div>
      )}
    </div>
  );
}
