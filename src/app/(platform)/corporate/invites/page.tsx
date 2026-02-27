'use client';

/**
 * Corporate Invites Page
 *
 * View all invites sent to students with status tracking.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Briefcase,
} from 'lucide-react';

interface Invite {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentUniversity: string | null;
  listingId: string | null;
  projectTitle: string | null;
  message: string;
  status: string;
  sentAt: string;
  respondedAt: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
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

export default function CorporateInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/corporate/invites')
      .then((r) => r.json())
      .then((data) => setInvites(data.invites || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredInvites = filter
    ? invites.filter((inv) => inv.status === filter)
    : invites;

  const counts = {
    all: invites.length,
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    declined: invites.filter((i) => i.status === 'declined').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Sent Invites
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Track invitations you&apos;ve sent to students
        </p>
      </div>

      {/* Tabs */}
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

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredInvites.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              {filter ? `No ${filter} invites` : 'No invites sent yet'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Find students in the &quot;Find Students&quot; section and send them invitations to your projects
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invite list */}
      {!loading && filteredInvites.length > 0 && (
        <div className="space-y-3">
          {filteredInvites.map((invite) => {
            const config = statusConfig[invite.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const isExpanded = expandedId === invite.id;

            return (
              <Card key={invite.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : invite.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                          {(invite.studentName?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm">{invite.studentName}</h3>
                            <Badge className={`${config.color} border-0`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            {invite.projectTitle && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {invite.projectTitle}
                              </span>
                            )}
                            <span>Sent {new Date(invite.sentAt).toLocaleDateString()}</span>
                            {invite.respondedAt && (
                              <span>
                                &middot; Responded {new Date(invite.respondedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : invite.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300">{invite.studentEmail}</span>
                        </div>
                        {invite.studentUniversity && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-300">{invite.studentUniversity}</span>
                          </div>
                        )}
                      </div>
                      {invite.message && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Your message</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                            {invite.message}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
