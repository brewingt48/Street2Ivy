'use client';

/**
 * Partner Listing Detail Page
 *
 * View listing details and manage applications:
 * - Listing info display
 * - Applications table with match scores and actions (accept/reject)
 * - Status management: publish, close
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Wifi,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  GraduationCap,
  FileText,
  Send,
  Lock,
} from 'lucide-react';

interface ListingDetail {
  id: string;
  networkPartnerId: string;
  partnerName: string;
  title: string;
  description: string | null;
  scopeOfWork: string | null;
  deliverables: string | null;
  category: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  paymentType: string | null;
  isPaid: boolean;
  estimatedHours: number | null;
  startDate: string | null;
  endDate: string | null;
  applicationDeadline: string | null;
  maxStudents: number;
  studentsAccepted: number;
  status: string;
  visibility: string;
  targetInstitutions: string[] | null;
  remoteOk: boolean;
  location: string | null;
  isAlumniProject: boolean;
  alumniMessage: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  applicationCount: number;
  acceptedCount: number;
  skills: {
    id: string;
    name: string;
    category: string | null;
    importance: string;
    minProficiency: number;
  }[];
}

interface Application {
  id: string;
  status: string;
  coverLetter: string | null;
  proposedApproach: string | null;
  availabilityNote: string | null;
  matchScore: string | null;
  skillsMatchScore: string | null;
  reviewedAt: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    gpa: string | null;
  };
  tenant: {
    id: string | null;
    name: string | null;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-600' },
};

const listingStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  open: { label: 'Open', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Closed', color: 'bg-red-100 text-red-600' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

export default function PartnerListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    appId: string;
    studentName: string;
    action: 'accepted' | 'rejected';
  }>({ open: false, appId: '', studentName: '', action: 'accepted' });

  const fetchData = useCallback(async () => {
    try {
      const [listingRes, appsRes] = await Promise.all([
        fetch(`/api/partner/listings/${listingId}`),
        fetch(`/api/partner/listings/${listingId}/applications`),
      ]);

      const listingData = await listingRes.json();
      const appsData = await appsRes.json();

      if (listingData.error) {
        setError(listingData.error);
        return;
      }

      setListing(listingData.listing);
      setApplications(appsData.applications || []);
    } catch {
      setError('Failed to load listing details');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusChangeLoading(true);
    try {
      const res = await csrfFetch(`/api/partner/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setListing((prev) =>
          prev ? { ...prev, status: data.listing.status } : null
        );
      }
    } catch {
      // silently fail
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const handleApplicationAction = async () => {
    const { appId, action } = confirmDialog;
    setActionLoading(appId);
    setConfirmDialog((prev) => ({ ...prev, open: false }));

    try {
      const res = await csrfFetch(`/api/partner/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (res.ok) {
        // Refresh data
        await fetchData();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/partner')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-red-500 font-medium">{error || 'Listing not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lstConfig = listingStatusConfig[listing.status] || listingStatusConfig.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/partner')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {listing.title}
              </h1>
              <Badge className={`${lstConfig.color} border-0`}>
                {lstConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {listing.partnerName}
              {listing.category ? ` \u00B7 ${listing.category}` : ''}
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {listing.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('open')}
              disabled={statusChangeLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {statusChangeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publish
            </Button>
          )}
          {listing.status === 'open' && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('closed')}
              disabled={statusChangeLoading}
            >
              {statusChangeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Lock className="h-4 w-4 mr-1" />
              )}
              Close Listing
            </Button>
          )}
        </div>
      </div>

      {/* Listing Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {listing.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Scope & Deliverables */}
          {(listing.scopeOfWork || listing.deliverables) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scope & Deliverables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {listing.scopeOfWork && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Scope of Work
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {listing.scopeOfWork}
                    </p>
                  </div>
                )}
                {listing.deliverables && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Deliverables
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {listing.deliverables}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alumni Message */}
          {listing.isAlumniProject && listing.alumniMessage && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-600" />
                  Alumni Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-300 italic whitespace-pre-wrap">
                  &ldquo;{listing.alumniMessage}&rdquo;
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.location && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {listing.location}
                </div>
              )}
              {listing.remoteOk && (
                <div className="flex items-center gap-2 text-teal-600">
                  <Wifi className="h-4 w-4" />
                  Remote OK
                </div>
              )}
              {listing.isPaid && (listing.budgetMin || listing.budgetMax) && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  {listing.budgetMin && listing.budgetMax
                    ? `$${Number(listing.budgetMin).toLocaleString()} - $${Number(listing.budgetMax).toLocaleString()}`
                    : listing.budgetMax
                      ? `Up to $${Number(listing.budgetMax).toLocaleString()}`
                      : `From $${Number(listing.budgetMin).toLocaleString()}`}
                  {listing.paymentType ? ` (${listing.paymentType})` : ''}
                </div>
              )}
              {listing.estimatedHours && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {listing.estimatedHours} hours estimated
                </div>
              )}
              {(listing.startDate || listing.endDate) && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {listing.startDate
                    ? new Date(listing.startDate).toLocaleDateString()
                    : 'TBD'}
                  {' \u2013 '}
                  {listing.endDate
                    ? new Date(listing.endDate).toLocaleDateString()
                    : 'TBD'}
                </div>
              )}
              {listing.applicationDeadline && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Deadline:{' '}
                  {new Date(listing.applicationDeadline).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Users className="h-4 w-4 text-slate-400" />
                {listing.studentsAccepted} / {listing.maxStudents} students
                accepted
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Globe className="h-4 w-4 text-slate-400" />
                Visibility: {listing.visibility}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {listing.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {listing.skills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant={
                        skill.importance === 'required'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {skill.name}
                      {skill.importance === 'required' && ' *'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>
            Applications ({applications.length})
          </CardTitle>
          <CardDescription>
            Review and manage student applications for this listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">
                {listing.status === 'draft'
                  ? 'Publish this listing to start receiving applications'
                  : 'Applications will appear here as students apply'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Student</th>
                    <th className="pb-3 pr-4 font-medium">Institution</th>
                    <th className="pb-3 pr-4 font-medium">Match</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Applied</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {applications.map((app) => {
                    const config =
                      statusConfig[app.status] || statusConfig.pending;
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium">
                              {app.student.firstName} {app.student.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {app.student.email}
                            </p>
                            {app.student.gpa && (
                              <p className="text-xs text-slate-400">
                                GPA: {app.student.gpa}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-slate-600 dark:text-slate-300">
                            {app.tenant.name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {app.matchScore ? (
                            <Badge
                              variant="outline"
                              className="text-teal-600 border-teal-200"
                            >
                              {Number(app.matchScore).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={`${config.color} border-0`}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-500">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {app.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                disabled={actionLoading === app.id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    appId: app.id,
                                    studentName: `${app.student.firstName} ${app.student.lastName}`,
                                    action: 'accepted',
                                  })
                                }
                              >
                                {actionLoading === app.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                disabled={actionLoading === app.id}
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    appId: app.id,
                                    studentName: `${app.student.firstName} ${app.student.lastName}`,
                                    action: 'rejected',
                                  })
                                }
                              >
                                {actionLoading === app.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {app.reviewedAt
                                ? `Reviewed ${new Date(app.reviewedAt).toLocaleDateString()}`
                                : ''}
                            </span>
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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'accepted'
                ? 'Accept Application'
                : 'Decline Application'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'accepted'
                ? `Are you sure you want to accept ${confirmDialog.studentName}'s application?`
                : `Are you sure you want to decline ${confirmDialog.studentName}'s application? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplicationAction}
              className={
                confirmDialog.action === 'accepted'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'accepted' ? 'Accept' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
