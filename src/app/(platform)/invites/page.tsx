'use client';

/**
 * Student Invites Page
 *
 * Displays invitations received from corporate partners with accept/decline actions.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ExternalLink,
  Briefcase,
} from 'lucide-react';

interface Invite {
  id: string;
  corporatePartnerId: string;
  corporateName: string;
  companyName: string | null;
  corporateBio: string | null;
  listingId: string | null;
  projectTitle: string | null;
  message: string | null;
  listingDescription: string | null;
  status: string;
  sentAt: string;
  respondedAt: string | null;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    inviteId: string;
    action: 'accept' | 'decline';
    projectTitle: string | null;
  }>({ open: false, inviteId: '', action: 'accept', projectTitle: null });

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/invites');
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const filteredInvites = filter
    ? invites.filter((inv) => inv.status === filter)
    : invites;

  const counts = {
    all: invites.length,
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    declined: invites.filter((i) => i.status === 'declined').length,
  };

  const openConfirmDialog = (inviteId: string, action: 'accept' | 'decline', projectTitle: string | null) => {
    setConfirmDialog({ open: true, inviteId, action, projectTitle });
  };

  const handleConfirmAction = async () => {
    const { inviteId, action } = confirmDialog;
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setActionLoading(`${inviteId}-${action}`);
    try {
      const res = await fetch(`/api/student/invites/${inviteId}/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchInvites();
      } else {
        console.error(`Failed to ${action} invite`);
      }
    } catch (err) {
      console.error(`Failed to ${action} invite:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Invites
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Review invitations from corporate partners to join their projects
        </p>
      </div>

      {/* Status Filter Tabs */}
      {!loading && invites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = tab.key
              ? counts[tab.key as keyof typeof counts] || 0
              : counts.all;
            return (
              <Button
                key={tab.key}
                variant={filter === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(tab.key)}
                className={filter === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {tab.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invites List */}
      {!loading && filteredInvites.length > 0 && (
        <div className="space-y-4">
          {filteredInvites.map((invite) => {
            const config = statusConfig[invite.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={invite.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <CardTitle className="text-base">
                          {invite.corporateName}
                        </CardTitle>
                        {invite.companyName && invite.companyName !== invite.corporateName && (
                          <span className="text-sm text-slate-500">
                            at {invite.companyName}
                          </span>
                        )}
                      </div>
                      {invite.projectTitle && (
                        <CardDescription className="mt-1 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {invite.listingId ? (
                            <Link
                              href={`/projects/${invite.listingId}`}
                              className="hover:text-teal-600 hover:underline transition-colors inline-flex items-center gap-1"
                            >
                              {invite.projectTitle}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span>{invite.projectTitle}</span>
                          )}
                        </CardDescription>
                      )}
                    </div>
                    <Badge className={`${config.color} border-0 shrink-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Invite Message */}
                  {invite.message && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {invite.message}
                      </p>
                    </div>
                  )}

                  {/* Listing Description Excerpt */}
                  {invite.listingDescription && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Project description:</span>{' '}
                      {invite.listingDescription.length > 200
                        ? `${invite.listingDescription.slice(0, 200)}...`
                        : invite.listingDescription}
                    </div>
                  )}

                  {/* Footer: date + actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      Sent {new Date(invite.sentAt).toLocaleDateString()}
                      {invite.respondedAt && (
                        <> &middot; Responded {new Date(invite.respondedAt).toLocaleDateString()}</>
                      )}
                    </span>

                    {invite.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => openConfirmDialog(invite.id, 'decline', invite.projectTitle)}
                          disabled={actionLoading === `${invite.id}-decline`}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          {actionLoading === `${invite.id}-decline` ? 'Declining...' : 'Decline'}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700"
                          onClick={() => openConfirmDialog(invite.id, 'accept', invite.projectTitle)}
                          disabled={actionLoading === `${invite.id}-accept`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {actionLoading === `${invite.id}-accept` ? 'Accepting...' : 'Accept'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredInvites.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              {filter ? `No ${filter} invites` : 'No invites yet'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {filter
                ? 'Try checking a different tab'
                : 'When corporate partners invite you to their projects, they will appear here'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'accept' ? 'Accept Invite' : 'Decline Invite'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} this invite
              {confirmDialog.projectTitle ? ` for "${confirmDialog.projectTitle}"` : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              className={
                confirmDialog.action === 'accept'
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'accept' ? 'Accept' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
