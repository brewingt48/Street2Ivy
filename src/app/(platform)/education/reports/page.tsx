'use client';

/**
 * Education Outcomes Reports Page
 *
 * Generate and download outcomes reports, and browse the report archive.
 * View button loads the report data and displays metrics in a detail panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Eye, Loader2, X, ArrowLeft, TrendingUp, Users, Briefcase, BarChart3 } from 'lucide-react';
import { ReportBuilder } from '@/components/outcomes/report-builder';

interface ReportItem {
  id: string;
  title: string;
  reportType: string;
  generatedAt: string;
  fileUrl: string | null;
}

interface MetricData {
  value: number;
  metadata: Record<string, unknown>;
}

interface ReportDetail {
  report: {
    id: string;
    title: string;
    reportType: string;
    filters: { reportType?: string; dateRange?: { start: string; end: string }; format?: string };
    generatedByName: string | null;
    generatedAt: string;
  };
  data: {
    institutionId: string;
    periodStart: string;
    periodEnd: string;
    computedAt: string;
    metrics: Record<string, MetricData>;
  };
}

const reportTypeLabels: Record<string, { label: string; color: string }> = {
  comprehensive: { label: 'Comprehensive', color: 'bg-purple-100 text-purple-700' },
  engagement: { label: 'Engagement', color: 'bg-blue-100 text-blue-700' },
  skills: { label: 'Skills', color: 'bg-green-100 text-green-700' },
  employer: { label: 'Employer', color: 'bg-amber-100 text-amber-700' },
};

/** Friendly labels for metric keys */
const metricLabels: Record<string, { label: string; icon: typeof TrendingUp; format?: 'percent' | 'decimal' | 'integer' }> = {
  total_projects_completed: { label: 'Projects Completed', icon: Briefcase, format: 'integer' },
  avg_projects_per_student: { label: 'Avg Projects per Student', icon: Users, format: 'decimal' },
  project_completion_rate: { label: 'Project Completion Rate', icon: TrendingUp, format: 'percent' },
  avg_readiness_score: { label: 'Avg Readiness Score', icon: BarChart3, format: 'decimal' },
  skills_verified_count: { label: 'Skills Verified', icon: BarChart3, format: 'integer' },
  employer_engagement_count: { label: 'Employer Engagements', icon: Briefcase, format: 'integer' },
  employer_satisfaction_avg: { label: 'Employer Satisfaction', icon: TrendingUp, format: 'decimal' },
  repeat_employer_rate: { label: 'Repeat Employer Rate', icon: TrendingUp, format: 'percent' },
  student_activation_rate: { label: 'Student Activation Rate', icon: Users, format: 'percent' },
  time_to_first_match: { label: 'Time to First Match (days)', icon: TrendingUp, format: 'decimal' },
  project_to_hire_conversion: { label: 'Project-to-Hire Conversion', icon: TrendingUp, format: 'percent' },
  active_students: { label: 'Active Students', icon: Users, format: 'integer' },
  total_applications: { label: 'Total Applications', icon: Briefcase, format: 'integer' },
  active_listings: { label: 'Active Listings', icon: Briefcase, format: 'integer' },
};

function formatMetricValue(value: number, format?: string): string {
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  if (format === 'decimal') return value.toFixed(1);
  if (format === 'integer') return Math.round(value).toLocaleString();
  return value.toLocaleString();
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportDetail | null>(null);
  const [viewLoading, setViewLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReportGenerated = () => {
    fetchReports();
  };

  const handleViewReport = async (reportId: string) => {
    setViewLoading(reportId);
    try {
      const res = await fetch(`/api/education/reports/${reportId}`);
      if (!res.ok) throw new Error('Failed to load report');
      const detail: ReportDetail = await res.json();
      setViewingReport(detail);
    } catch (err) {
      console.error('Failed to view report:', err);
    } finally {
      setViewLoading(null);
    }
  };

  const handleExportCSV = () => {
    if (!viewingReport) return;
    const { report, data } = viewingReport;
    const rows: string[] = ['Metric,Value,Period Start,Period End'];
    for (const [key, metric] of Object.entries(data.metrics)) {
      const label = metricLabels[key]?.label || key;
      rows.push(`"${label}",${metric.value},${data.periodStart},${data.periodEnd}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Report detail view
  if (viewingReport) {
    const { report, data } = viewingReport;
    const typeConfig = reportTypeLabels[report.reportType] || {
      label: report.reportType,
      color: 'bg-slate-100 text-slate-700',
    };
    const metrics = Object.entries(data.metrics);

    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingReport(null)}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </div>

        {/* Report header card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  {report.title}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={`${typeConfig.color} border-0`}>
                    {typeConfig.label}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  {report.generatedByName && (
                    <span className="text-sm text-slate-500">
                      by {report.generatedByName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Period: {data.periodStart} to {data.periodEnd}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Metrics grid */}
        {metrics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(([key, metric]) => {
              const config = metricLabels[key];
              const Icon = config?.icon || BarChart3;
              const label = config?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const formattedValue = formatMetricValue(metric.value, config?.format);

              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                          {formattedValue}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                        <Icon className="h-5 w-5 text-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-600 dark:text-slate-300">
                No metrics data available
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                This report period may not have sufficient data to compute metrics.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Report list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-8 w-8 text-teal-600" />
          Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Generate and download outcomes reports for your institution. Reports compile student engagement, skill development, employer satisfaction, and program performance data into downloadable formats for stakeholder review and accreditation.
        </p>
      </div>

      {/* Report Builder */}
      <ReportBuilder onReportGenerated={handleReportGenerated} />

      {/* Report Archive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Archive</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Previously generated reports are stored here. Download reports at any time for record-keeping or sharing with stakeholders.
          </p>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && reports.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-600 dark:text-slate-300">
                No reports generated yet
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Use the form above to generate your first outcomes report
              </p>
            </div>
          )}

          {/* Reports Table */}
          {!loading && reports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Generated</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((report) => {
                    const typeConfig = reportTypeLabels[report.reportType] || {
                      label: report.reportType,
                      color: 'bg-slate-100 text-slate-700',
                    };
                    const isLoadingThis = viewLoading === report.id;

                    return (
                      <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-medium text-slate-900 dark:text-white">
                          {report.title}
                        </td>
                        <td className="py-3">
                          <Badge className={`${typeConfig.color} border-0`}>
                            {typeConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {new Date(report.generatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(report.id)}
                            disabled={isLoadingThis}
                          >
                            {isLoadingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
