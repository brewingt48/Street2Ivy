'use client';

/**
 * Platform Admin Dashboard
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, Briefcase, FileText, Clock, GraduationCap } from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-10 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const users = (data?.users as Record<string, number>) || {};
  const listings = (data?.listings as Record<string, number>) || {};
  const apps = (data?.applications as Record<string, number>) || {};
  const recentUsers = (data?.recentUsers as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Platform administration and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers as number || 0}</div>
            <p className="text-xs text-slate-400">
              {users.student || 0} students, {users.corporate_partner || 0} corps
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.activeTenants as number || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listings</CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(listings).reduce((a, b) => a + b, 0)}</div>
            <p className="text-xs text-slate-400">{listings.published || 0} published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(apps).reduce((a, b) => a + b, 0)}</div>
            <p className="text-xs text-slate-400">{apps.pending || 0} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.waitlist as number || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edu Apps</CardTitle>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values((data?.eduApplications as Record<string, number>) || {}).reduce((a, b) => a + b, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id as string} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{u.name as string}</p>
                    <p className="text-xs text-slate-400">{u.email as string}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{(u.role as string).replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { href: '/admin/users', label: 'Manage Users', icon: Users },
                { href: '/admin/tenants', label: 'Manage Tenants', icon: Building2 },
                { href: '/admin/institutions', label: 'Institutions', icon: GraduationCap },
                { href: '/admin/blog', label: 'Blog CMS', icon: FileText },
                { href: '/admin/waitlist', label: 'Waitlist', icon: Clock },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                  <link.icon className="h-4 w-4 text-slate-400" />
                  {link.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
