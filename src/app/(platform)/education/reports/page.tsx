'use client';

/**
 * Education Outcomes Reports Page
 *
 * Generate and download outcomes reports, and browse the report archive.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Eye } from 'lucide-react';
import { ReportBuilder } from '@/components/outcomes/report-builder';

interface ReportItem {
  id: string;
  title: string;
  reportType: string;
  generatedAt: string;
  fileUrl: string | null;
}

const reportTypeLabels: Record<string, { label: string; color: string }> = {
  comprehensive: { label: 'Comprehensive', color: 'bg-purple-100 text-purple-700' },
  engagement: { label: 'Engagement', color: 'bg-blue-100 text-blue-700' },
  skills: { label: 'Skills', color: 'bg-green-100 text-green-700' },
  employer: { label: 'Employer', color: 'bg-amber-100 text-amber-700' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-8 w-8 text-teal-600" />
          Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Generate and download outcomes reports
        </p>
      </div>

      {/* Report Builder */}
      <ReportBuilder onReportGenerated={handleReportGenerated} />

      {/* Report Archive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Archive</CardTitle>
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
                          {report.fileUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href={report.fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          )}
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
