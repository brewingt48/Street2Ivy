'use client';

/**
 * My Applications Page
 *
 * List of student's project applications with status filters.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
  Download,
  Star,
} from 'lucide-react';
import { ExportButton } from '@/components/analytics/export-button';

interface Application {
  id: string;
  status: string;
  coverLetter: string | null;
  submittedAt: string;
  respondedAt: string | null;
  listingId: string;
  listingTitle: string;
  corporateName: string;
  interestReason: string | null;
  hoursPerWeek: number | null;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const fetchApplications = async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setCounts(data.counts || {});
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(statusFilter);
  }, [statusFilter]);

  const handleWithdraw = async (id: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawing(id);
    try {
      const res = await csrfFetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });
      if (res.ok) {
        fetchApplications(statusFilter);
      }
    } catch (err) {
      console.error('Failed to withdraw:', err);
    } finally {
      setWithdrawing(null);
    }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            My Applications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your project applications and their current status
          </p>
          <p className="text-xs text-slate-400 mt-2">
            <strong>Pending</strong> = awaiting review &middot; <strong>Accepted</strong> = you&apos;re in! &middot; <strong>Completed</strong> = project finished &middot; <strong>Withdraw</strong> to cancel a pending application
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={applications as unknown as Record<string, unknown>[]}
            filename="my-applications"
            columns={[
              { key: 'listingTitle', label: 'Project' },
              { key: 'corporateName', label: 'Company' },
              { key: 'status', label: 'Status' },
              { key: 'submittedAt', label: 'Applied', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
              { key: 'respondedAt', label: 'Response', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
            ]}
          />
          <Button
            onClick={() => router.push('/projects')}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Browse Projects
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tab.key ? counts[tab.key] || 0 : totalCount;
          return (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
              className={statusFilter === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              {tab.label}
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-xs px-1.5 py-0"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {/* Applications List */}
      {!loading && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] || statusConfig.pending;
            return (
              <Card key={app.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3
                          className="font-medium text-sm truncate cursor-pointer hover:text-teal-600 transition-colors"
                          onClick={() => router.push(`/projects/${app.listingId}`)}
                        >
                          {app.listingTitle}
                        </h3>
                        <Badge className={`${config.color} border-0 shrink-0`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{app.corporateName || 'Company'}</span>
                        <span>&middot;</span>
                        <span>
                          Applied {new Date(app.submittedAt).toLocaleDateString()}
                        </span>
                        {app.respondedAt && (
                          <>
                            <span>&middot;</span>
                            <span>
                              Responded {new Date(app.respondedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      {app.coverLetter && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {app.coverLetter}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleWithdraw(app.id)}
                          disabled={withdrawing === app.id}
                        >
                          {withdrawing === app.id ? 'Withdrawing...' : 'Withdraw'}
                        </Button>
                      )}
                      {app.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={(e) => { e.stopPropagation(); router.push(`/applications/${app.id}`); }}
                        >
                          <Star className="h-3.5 w-3.5 mr-1" /> View Review
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/applications/${app.id}`)}
                      >
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && applications.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              {statusFilter ? `No ${statusFilter} applications` : 'No applications yet'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {statusFilter
                ? 'Try selecting a different status filter'
                : 'Browse projects and submit your first application'}
            </p>
            {!statusFilter && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/projects')}
              >
                Browse Projects
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
