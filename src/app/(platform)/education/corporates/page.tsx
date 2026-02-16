'use client';

/**
 * Education Admin — Corporate Partner Management
 *
 * Edu admins can approve, reject, or discontinue corporate partners
 * within their tenant.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Star,
  Building2,
} from 'lucide-react';

interface Corporate {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  stockSymbol: string | null;
  isPubliclyTraded: boolean;
  isActive: boolean;
  approvalStatus: string;
  avgRating: number | null;
  ratingCount: number | null;
  createdAt: string;
  listingCount: number;
}

const approvalColors: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  discontinued: 'bg-slate-100 text-slate-600',
};

export default function EducationCorporatesPage() {
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionTarget, setActionTarget] = useState<Corporate | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCorporates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('q', query);
    try {
      const res = await fetch(`/api/education/corporates?${params}`);
      const data = await res.json();
      setCorporates(data.corporates || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchCorporates();
  }, [fetchCorporates]);

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      const res = await csrfFetch(`/api/admin/users/${actionTarget.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, reason: actionReason }),
      });
      if (res.ok) {
        setActionTarget(null);
        setActionType('');
        setActionReason('');
        fetchCorporates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const openAction = (corp: Corporate, action: string) => {
    setActionTarget(corp);
    setActionType(action);
    setActionReason('');
  };

  const pendingCount = corporates.filter((c) => c.approvalStatus === 'pending_approval').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Corporate Partners</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage corporate partner access to your institution
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-700 border-0 text-sm px-3 py-1">
            {pendingCount} Pending Approval
          </Badge>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, or company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchCorporates();
              }
            }}
          />
        </div>
        <Button
          onClick={() => {
            setPage(1);
            fetchCorporates();
          }}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Search
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : corporates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No corporate partners found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {corporates.map((corp) => (
            <Card
              key={corp.id}
              className={
                corp.approvalStatus === 'pending_approval'
                  ? 'border-yellow-200 bg-yellow-50/30'
                  : ''
              }
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {(corp.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{corp.name}</p>
                      {corp.avgRating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {Number(corp.avgRating).toFixed(1)}
                          <span className="text-slate-400">({corp.ratingCount})</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400">{corp.email}</p>
                    {corp.companyName && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" /> {corp.companyName}
                        {corp.companyWebsite && (
                          <a
                            href={corp.companyWebsite.startsWith('http') ? corp.companyWebsite : `https://${corp.companyWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            (website)
                          </a>
                        )}
                        {corp.isPubliclyTraded && corp.stockSymbol ? (
                          <span className="text-blue-600 font-medium ml-1">${corp.stockSymbol}</span>
                        ) : (
                          <span className="text-slate-400 ml-1">(Private)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {corp.listingCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {corp.listingCount} listing{corp.listingCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Badge
                    className={`border-0 text-xs ${approvalColors[corp.approvalStatus] || ''}`}
                  >
                    {corp.approvalStatus.replace('_', ' ')}
                  </Badge>

                  <div className="flex items-center gap-1 ml-2">
                    {corp.approvalStatus === 'pending_approval' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openAction(corp, 'approve')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openAction(corp, 'reject')}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {corp.approvalStatus === 'approved' && corp.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openAction(corp, 'discontinue')}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" /> Discontinue
                      </Button>
                    )}
                    {(corp.approvalStatus === 'rejected' ||
                      corp.approvalStatus === 'discontinued') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => openAction(corp, 'reactivate')}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null);
            setActionType('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" /> Approve Partner
                </>
              )}
              {actionType === 'reject' && (
                <>
                  <XCircle className="h-5 w-5 text-red-600" /> Reject Partner
                </>
              )}
              {actionType === 'discontinue' && (
                <>
                  <Ban className="h-5 w-5 text-red-600" /> Discontinue Partner
                </>
              )}
              {actionType === 'reactivate' && (
                <>
                  <RefreshCw className="h-5 w-5 text-teal-600" /> Reactivate Partner
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' &&
                `Approving ${actionTarget?.name} will allow them to post projects and connect with students at your institution.`}
              {actionType === 'reject' &&
                `Rejecting ${actionTarget?.name} will prevent them from accessing your institution's platform.`}
              {actionType === 'discontinue' &&
                `Discontinuing ${actionTarget?.name} will revoke their access. Their existing listings will be closed.`}
              {actionType === 'reactivate' &&
                `Reactivating ${actionTarget?.name} will restore their access to your institution.`}
            </DialogDescription>
          </DialogHeader>

          {(actionType === 'reject' || actionType === 'discontinue') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide a reason..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget(null);
                setActionType('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : actionType === 'reactivate'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading
                ? 'Processing...'
                : actionType === 'approve'
                  ? 'Approve'
                  : actionType === 'reject'
                    ? 'Reject'
                    : actionType === 'discontinue'
                      ? 'Discontinue'
                      : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
