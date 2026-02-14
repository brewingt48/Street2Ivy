'use client';

/**
 * Admin Tenants List — Enhanced with stats, search, and quick actions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  ExternalLink,
  GraduationCap,
  Briefcase,
  FileText,
  Plus,
  Search,
  Users,
  Download,
} from 'lucide-react';
import { ExportButton } from '@/components/analytics/export-button';

interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  displayName: string | null;
  status: string;
  institutionDomain: string | null;
  branding: Record<string, string>;
  features: Record<string, unknown>;
  createdAt: string;
  stats: {
    students: number;
    corporates: number;
    admins: number;
    listings: number;
  };
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(d.tenants || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
    suspended: 'bg-red-100 text-red-700',
  };

  const totalStats = tenants.reduce(
    (acc, t) => ({
      students: acc.students + t.stats.students,
      corporates: acc.corporates + t.stats.corporates,
      listings: acc.listings + t.stats.listings,
    }),
    { students: 0, corporates: 0, listings: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tenants</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {tenants.length} institution{tenants.length !== 1 ? 's' : ''} on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={tenants.map((t) => ({
              name: t.name,
              subdomain: t.subdomain,
              status: t.status,
              students: t.stats?.students || 0,
              corporates: t.stats?.corporates || 0,
              listings: t.stats?.listings || 0,
              createdAt: t.createdAt,
            })) as unknown as Record<string, unknown>[]}
            filename="tenants"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'subdomain', label: 'Subdomain' },
              { key: 'status', label: 'Status' },
              { key: 'students', label: 'Students' },
              { key: 'corporates', label: 'Corporates' },
              { key: 'listings', label: 'Listings' },
              { key: 'createdAt', label: 'Created', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
            ]}
          />
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => router.push('/admin/tenants/new')}
          >
            <Plus className="h-4 w-4 mr-2" /> New Tenant
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {!loading && tenants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{tenants.length}</p>
                <p className="text-xs text-slate-500">Tenants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStats.students}</p>
                <p className="text-xs text-slate-500">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStats.corporates}</p>
                <p className="text-xs text-slate-500">Corporate Partners</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalStats.listings}</p>
                <p className="text-xs text-slate-500">Total Listings</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'active', 'inactive', 'suspended'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Tenant List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {search || statusFilter !== 'all' ? 'No tenants match your filters' : 'No tenants yet'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button
                className="mt-4 bg-teal-600 hover:bg-teal-700"
                onClick={() => router.push('/admin/tenants/new')}
              >
                <Plus className="h-4 w-4 mr-2" /> Create First Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/admin/tenants/${t.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Color swatch */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{ backgroundColor: t.branding?.primaryColor || '#0F766E' }}
                    >
                      {(t.displayName || t.name).charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                        <Badge className={`border-0 text-xs ${statusColors[t.status] || ''}`}>{t.status}</Badge>
                        {(t.features as Record<string, unknown>)?.plan ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {String((t.features as Record<string, unknown>).plan)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-sm text-slate-500 font-mono">{t.subdomain}.campus2career.com</p>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </div>
                      {t.institutionDomain && (
                        <p className="text-xs text-slate-400 mt-0.5">{t.institutionDomain}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5" title="Students">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      <span>{t.stats.students}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Corporate Partners">
                      <Briefcase className="h-4 w-4 text-teal-500" />
                      <span>{t.stats.corporates}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Admins">
                      <Users className="h-4 w-4 text-amber-500" />
                      <span>{t.stats.admins}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Listings">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span>{t.stats.listings}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
