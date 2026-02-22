'use client';

/**
 * Education Admin — Team Huddle Analytics Dashboard
 *
 * Displays engagement metrics: views over time, content type breakdown,
 * top posts, top contributors, and top topics.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartCard } from '@/components/analytics/chart-card';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Bookmark,
  Users,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalPosts: number;
    publishedPosts: number;
    pendingPosts: number;
    totalViews: number;
    totalBookmarks: number;
    activeContributors: number;
  };
  viewsOverTime: { date: string; views: number }[];
  contentTypeBreakdown: { name: string; value: number }[];
  topPosts: {
    id: string;
    title: string;
    contentType: string;
    views: number;
    bookmarks: number;
  }[];
  topContributors: {
    name: string;
    role: string;
    postCount: number;
    totalViews: number;
  }[];
  topTopics: { name: string; views: number }[];
}

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  article: 'Article',
  pdf: 'PDF',
  audio: 'Audio',
  text_post: 'Post',
};

export default function HuddleAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/education/huddle/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  // Format date for chart labels (e.g., "Jan 15")
  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content Management
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-teal-600" />
            Huddle Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track content engagement and contributor performance
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FileText className="h-5 w-5 text-teal-600" />}
              label="Published Posts"
              value={data.summary.publishedPosts}
              subtitle={`${data.summary.pendingPosts} pending review`}
            />
            <StatCard
              icon={<Eye className="h-5 w-5 text-sky-600" />}
              label="Total Views"
              value={data.summary.totalViews}
              subtitle={`${period === 'all' ? 'all time' : `last ${period}`}`}
            />
            <StatCard
              icon={<Bookmark className="h-5 w-5 text-violet-600" />}
              label="Bookmarks"
              value={data.summary.totalBookmarks}
              subtitle="across all posts"
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-orange-600" />}
              label="Contributors"
              value={data.summary.activeContributors}
              subtitle="active contributors"
            />
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Views Over Time — Line Chart */}
            <ChartCard
              type="line"
              title="Views Over Time"
              description={`Daily views — ${period === 'all' ? 'all time' : `last ${period}`}`}
              data={data.viewsOverTime.map((d) => ({
                ...d,
                date: formatChartDate(d.date),
              }))}
              xKey="date"
              series={[{ key: 'views', label: 'Views', color: '#0d9488' }]}
              height={280}
            />

            {/* Content Type Breakdown — Pie Chart */}
            <ChartCard
              type="pie"
              title="Content Types"
              description="Distribution of published content"
              data={data.contentTypeBreakdown}
              nameKey="name"
              valueKey="value"
              height={280}
            />
          </div>

          {/* Top Topics — Bar Chart */}
          {data.topTopics.length > 0 && (
            <ChartCard
              type="bar"
              title="Top Topics by Views"
              description="Most popular content topics"
              data={data.topTopics}
              xKey="name"
              series={[{ key: 'views', label: 'Views', color: '#0d9488' }]}
              height={280}
            />
          )}

          {/* Top Posts Table */}
          {data.topPosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Top Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2 pr-4">Post</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4 text-right">Views</th>
                        <th className="pb-2 text-right">Bookmarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPosts.map((post, idx) => (
                        <tr
                          key={post.id}
                          className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-5 text-right">
                                {idx + 1}.
                              </span>
                              <span className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                                {post.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge variant="outline" className="text-xs">
                              {TYPE_LABELS[post.contentType] || post.contentType}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {post.views.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {post.bookmarks.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Contributors Table */}
          {data.topContributors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2 pr-4">Contributor</th>
                        <th className="pb-2 pr-4">Role</th>
                        <th className="pb-2 pr-4 text-right">Posts</th>
                        <th className="pb-2 text-right">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topContributors.map((c, idx) => (
                        <tr
                          key={idx}
                          className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-5 text-right">
                                {idx + 1}.
                              </span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {c.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                c.role === 'alumni'
                                  ? 'border-teal-200 text-teal-700'
                                  : c.role === 'partner'
                                  ? 'border-sky-200 text-sky-700'
                                  : 'border-violet-200 text-violet-700'
                              }`}
                            >
                              {c.role === 'alumni'
                                ? 'Alumni'
                                : c.role === 'partner'
                                ? 'Partner'
                                : c.role}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {c.postCount}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {c.totalViews.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {data.summary.totalPosts === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No content data yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Publish some posts to start seeing analytics
                </p>
                <Button
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                  onClick={() => router.push('/education/huddle/new')}
                >
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">Failed to load analytics data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Helper Component ---------- */

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
