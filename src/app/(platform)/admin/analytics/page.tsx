'use client';

/**
 * Platform Admin Analytics Page
 *
 * Comprehensive platform analytics:
 * - User growth, application volume
 * - Users by role, listings by category
 * - Tenant health table
 * - Top institutions table
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
  Users,
  UserPlus,
  Building2,
  Briefcase,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalUsers: number;
    newUsersThisPeriod: number;
    activeTenants: number;
    totalListings: number;
    totalApplications: number;
    platformCompletionRate: number;
  };
  userGrowth: { date: string; students: number; corporates: number; eduAdmins: number }[];
  applicationVolume: { date: string; submitted: number; accepted: number; completed: number }[];
  usersByRole: { role: string; count: number }[];
  listingsByCategory: { category: string; count: number }[];
  tenantHealth: {
    id: string;
    name: string;
    students: number;
    corporates: number;
    listings: number;
    applications: number;
    lastActivity: string | null;
  }[];
  topInstitutions: {
    name: string;
    students: number;
    placements: number;
  }[];
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
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

  const userGrowthData = data.userGrowth.map((t) => ({
    ...t,
    date: formatChartDate(t.date, range),
  }));

  const appVolumeData = data.applicationVolume.map((t) => ({
    ...t,
    date: formatChartDate(t.date, range),
  }));

  const tenantColumns: TableColumn[] = [
    { key: 'name', label: 'Tenant', sortable: true },
    { key: 'students', label: 'Students', sortable: true, align: 'right' },
    { key: 'corporates', label: 'Corporates', sortable: true, align: 'right' },
    { key: 'listings', label: 'Listings', sortable: true, align: 'right' },
    { key: 'applications', label: 'Apps', sortable: true, align: 'right' },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      sortable: true,
      format: (val) => val ? new Date(val as string).toLocaleDateString() : 'Never',
    },
  ];

  const institutionColumns: TableColumn[] = [
    { key: 'name', label: 'Institution', sortable: true },
    { key: 'students', label: 'Students', sortable: true, align: 'right' },
    { key: 'placements', label: 'Placements', sortable: true, align: 'right' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Platform Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Platform-wide metrics, growth trends, and tenant health
            </p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Users"
          value={data.summary.totalUsers}
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          label="New This Period"
          value={data.summary.newUsersThisPeriod}
          icon={UserPlus}
          href="/admin/users"
        />
        <StatCard
          label="Active Tenants"
          value={data.summary.activeTenants}
          icon={Building2}
          href="/admin/tenants"
        />
        <StatCard
          label="Total Listings"
          value={data.summary.totalListings}
          icon={Briefcase}
        />
        <StatCard
          label="Applications"
          value={data.summary.totalApplications}
          icon={FileText}
        />
        <StatCard
          label="Completion Rate"
          value={`${data.summary.platformCompletionRate}%`}
          icon={CheckCircle2}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          type="line"
          title="User Growth"
          description="New registrations over time by role"
          data={userGrowthData}
          xKey="date"
          series={[
            { key: 'students', label: 'Students', color: '#0d9488' },
            { key: 'corporates', label: 'Corporates', color: '#0284c7' },
            { key: 'eduAdmins', label: 'Edu Admins', color: '#7c3aed' },
          ]}
        />
        <ChartCard
          type="bar"
          title="Application Volume"
          description="Applications submitted, accepted, and completed"
          data={appVolumeData}
          xKey="date"
          series={[
            { key: 'submitted', label: 'Submitted', color: '#0d9488' },
            { key: 'accepted', label: 'Accepted', color: '#0284c7' },
            { key: 'completed', label: 'Completed', color: '#059669' },
          ]}
        />
      </div>

      {/* Role & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          type="pie"
          title="Users by Role"
          data={data.usersByRole}
          nameKey="role"
          valueKey="count"
        />
        <ChartCard
          type="pie"
          title="Listings by Category"
          data={data.listingsByCategory}
          nameKey="category"
          valueKey="count"
        />
      </div>

      {/* Tenant Health Table */}
      <DataTable
        title="Tenant Health"
        data={data.tenantHealth as unknown as Record<string, unknown>[]}
        columns={tenantColumns}
        exportFilename={`tenant-health-${range}`}
        pageSize={10}
        onRowClick={(row) => router.push(`/admin/tenants`)}
      />

      {/* Top Institutions */}
      <DataTable
        title="Top Institutions"
        data={data.topInstitutions as unknown as Record<string, unknown>[]}
        columns={institutionColumns}
        exportFilename={`top-institutions-${range}`}
        pageSize={10}
      />
    </div>
  );
}
