'use client';

/**
 * Network Partner Dashboard
 *
 * Shows summary cards, recent applications, and quick actions
 * for network partner users.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Briefcase,
  FileText,
  Users,
  ArrowRight,
  Plus,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';

interface DashboardData {
  partnerUser: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    partnerName: string;
    partnerSlug: string;
  };
  listings: {
    active: number;
    draft: number;
    closed: number;
    completed: number;
    total: number;
  };
  applications: {
    pending: number;
    accepted: number;
    rejected: number;
    completed: number;
    total: number;
  };
  recentApplications: {
    id: string;
    status: string;
    matchScore: string | null;
    createdAt: string;
    listingId: string;
    listingTitle: string;
    studentName: string;
    studentEmail: string;
    tenantName: string | null;
  }[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-600' },
};

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <p className="text-sm text-slate-400 mt-2">
              Make sure your account is linked to a network partner organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back
            {data.partnerUser.firstName
              ? `, ${data.partnerUser.firstName}`
              : ''}
            !
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {data.partnerUser.partnerName} &mdash; Partner Dashboard
          </p>
        </div>
        <Button
          onClick={() => router.push('/partner/listings/new')}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="h-4 w-4 mr-2" /> Create Listing
        </Button>
      </div>

      {/* Quick Tips */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">Getting Started</p>
            <ul className="space-y-1 text-teal-700 dark:text-teal-400">
              <li>
                &bull; <strong>Create Listing</strong> &mdash; Post a project
                opportunity visible across the network
              </li>
              <li>
                &bull; <strong>Review Applications</strong> &mdash; View student
                applications, match scores, and accept or decline
              </li>
              <li>
                &bull; <strong>Manage Listings</strong> &mdash; Publish drafts,
                close listings, or update details
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Listings
            </CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.listings.active}</div>
            <p className="text-xs text-slate-500">
              {data.listings.draft} draft, {data.listings.total} total
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.applications.total}
            </div>
            <p className="text-xs text-slate-500">
              {data.applications.pending} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accepted Students
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.applications.accepted}
            </div>
            <p className="text-xs text-slate-500">
              {data.applications.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.applications.pending}
            </div>
            <p className="text-xs text-slate-500">
              Applications awaiting your response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>
              Latest student applications to your listings
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentApplications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">
                Create and publish a listing to start receiving applications
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/partner/listings/new')}
              >
                Create Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentApplications.map((app) => {
                const config =
                  statusConfig[app.status] || statusConfig.pending;
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/partner/listings/${app.listingId}`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {app.studentName}
                        </p>
                        {app.matchScore && (
                          <Badge
                            variant="outline"
                            className="text-xs text-teal-600"
                          >
                            {Number(app.matchScore).toFixed(0)}% match
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {app.listingTitle}
                        {app.tenantName ? ` \u00B7 ${app.tenantName}` : ''}
                        {' \u00B7 '}
                        {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${config.color} border-0 ml-2`}>
                      {config.label}
                    </Badge>
                  </div>
                );
              })}

              {data.applications.total > 10 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    View All Applications{' '}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/partner/listings/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Plus className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="font-medium group-hover:text-teal-600 transition-colors">
                  Create New Listing
                </p>
                <p className="text-sm text-slate-500">
                  Post a new project opportunity for students
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/inbox">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium group-hover:text-blue-600 transition-colors">
                  Messages
                </p>
                <p className="text-sm text-slate-500">
                  Communicate with students and institutions
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
