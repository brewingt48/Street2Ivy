'use client';

/**
 * Education Admin Reports Page
 *
 * View and manage issue reports from students.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Search, FileText } from 'lucide-react';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedEntityId: string;
  reportedEntityName: string;
  applicationId: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  safety: { label: 'Safety', color: 'bg-red-100 text-red-700' },
  harassment: { label: 'Harassment', color: 'bg-red-100 text-red-700' },
  payment: { label: 'Payment', color: 'bg-yellow-100 text-yellow-700' },
  communication: { label: 'Communication', color: 'bg-blue-100 text-blue-700' },
  discrimination: { label: 'Discrimination', color: 'bg-red-100 text-red-700' },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-100 text-yellow-700' },
  investigating: { label: 'Investigating', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'resolved', label: 'Resolved' },
];

export default function EducationReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Resolve dialog
  const [resolvingReport, setResolvingReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchReports = async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/education/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(statusFilter);
  }, [statusFilter]);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/education/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: newStatus === 'resolved' ? resolutionNotes || undefined : undefined,
        }),
      });
      if (res.ok) {
        setResolvingReport(null);
        setResolutionNotes('');
        fetchReports(statusFilter);
      }
    } catch (err) {
      console.error('Failed to update report:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Issue Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Review and manage issue reports submitted by students
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
            className={statusFilter === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            {tab.label}
          </Button>
        ))}
        {total > 0 && (
          <span className="text-sm text-slate-400 flex items-center ml-2">
            {total} report{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              {statusFilter ? `No ${statusFilter} reports` : 'No issue reports'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Issue reports from students will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!loading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => {
            const catConfig = categoryConfig[report.category] || categoryConfig.other;
            const statConfig = statusConfig[report.status] || statusConfig.open;
            const isExpanded = expandedId === report.id;

            return (
              <Card key={report.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{report.subject}</h3>
                        <Badge className={`${catConfig.color} border-0`}>{catConfig.label}</Badge>
                        <Badge className={`${statConfig.color} border-0`}>{statConfig.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>Reported by: <strong>{report.reporterName}</strong></span>
                        <span>&middot;</span>
                        <span>About: <strong>{report.reportedEntityName}</strong></span>
                        <span>&middot;</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {report.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleUpdateStatus(report.id, 'investigating')}
                          disabled={processing}
                        >
                          <Search className="h-3 w-3 mr-1" /> Investigate
                        </Button>
                      )}
                      {(report.status === 'open' || report.status === 'investigating') && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setResolvingReport(report);
                            setResolutionNotes('');
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Description</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                          {report.description}
                        </p>
                      </div>
                      {report.resolutionNotes && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Resolution Notes</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                            {report.resolutionNotes}
                          </p>
                        </div>
                      )}
                      {report.resolvedAt && (
                        <p className="text-xs text-slate-400">
                          Resolved on {new Date(report.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingReport} onOpenChange={() => { setResolvingReport(null); setResolutionNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Issue Report</DialogTitle>
            <DialogDescription>
              {resolvingReport?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe the resolution or actions taken..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingReport(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolvingReport && handleUpdateStatus(resolvingReport.id, 'resolved')}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : 'Mark as Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
