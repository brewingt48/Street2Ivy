'use client';

/**
 * Network Partners Admin Page
 *
 * Lists all network partners with filtering, search, pagination,
 * and a create partner dialog. Row click navigates to detail page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  Star,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetworkPartner {
  id: string;
  name: string;
  slug: string;
  type: string;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  companySize: string | null;
  headquarters: string | null;
  isAlumniPartner: boolean;
  alumniInstitution: string | null;
  alumniSport: string | null;
  status: string;
  visibility: string;
  verified: boolean;
  featured: boolean;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    tenants: number;
    listings: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTNER_TYPES = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'alumni_business', label: 'Alumni Business' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'government', label: 'Government' },
  { value: 'startup', label: 'Startup' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const TYPE_COLORS: Record<string, string> = {
  corporation: 'bg-blue-100 text-blue-700',
  alumni_business: 'bg-purple-100 text-purple-700',
  nonprofit: 'bg-teal-100 text-teal-700',
  government: 'bg-amber-100 text-amber-700',
  startup: 'bg-pink-100 text-pink-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<NetworkPartner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAlumni, setFilterAlumni] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newType, setNewType] = useState('corporation');
  const [newIndustry, setNewIndustry] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCompanySize, setNewCompanySize] = useState('');
  const [newHeadquarters, setNewHeadquarters] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newIsAlumni, setNewIsAlumni] = useState(false);
  const [newAlumniInstitution, setNewAlumniInstitution] = useState('');
  const [newAlumniSport, setNewAlumniSport] = useState('');
  const [newAlumniGradYear, setNewAlumniGradYear] = useState('');
  const [newAlumniPosition, setNewAlumniPosition] = useState('');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterAlumni) params.set('alumni', 'true');
      params.set('page', String(currentPage));
      params.set('limit', '25');

      const res = await fetch(`/api/admin/network-partners?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch partners');
      const data = await res.json();
      setPartners(data.partners || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (err) {
      console.error(err);
      setError('Failed to load network partners.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, filterStatus, filterAlumni, currentPage]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Debounced search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, filterAlumni]);

  // ---------------------------------------------------------------------------
  // Create handler
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');

    try {
      const body: Record<string, unknown> = {
        name: newName,
        slug: newSlug,
        type: newType,
        industry: newIndustry || undefined,
        website: newWebsite || undefined,
        description: newDescription || undefined,
        companySize: newCompanySize || undefined,
        headquarters: newHeadquarters || undefined,
        primaryContactName: newContactName || undefined,
        primaryContactEmail: newContactEmail || undefined,
        primaryContactPhone: newContactPhone || undefined,
        isAlumniPartner: newIsAlumni,
      };

      if (newIsAlumni) {
        body.alumniInstitution = newAlumniInstitution || undefined;
        body.alumniSport = newAlumniSport || undefined;
        body.alumniGraduationYear = newAlumniGradYear ? Number(newAlumniGradYear) : undefined;
        body.alumniPosition = newAlumniPosition || undefined;
      }

      const res = await fetch('/api/admin/network-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create partner');
      }

      setShowCreate(false);
      resetCreateForm();
      fetchPartners();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create partner');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewSlug('');
    setNewType('corporation');
    setNewIndustry('');
    setNewWebsite('');
    setNewDescription('');
    setNewCompanySize('');
    setNewHeadquarters('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewIsAlumni(false);
    setNewAlumniInstitution('');
    setNewAlumniSport('');
    setNewAlumniGradYear('');
    setNewAlumniPosition('');
    setCreateError('');
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewName(name);
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(name));
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading && partners.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-7 w-7 text-teal-600" />
            Network Partners
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage corporate and alumni partners in the shared network
          </p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => {
            resetCreateForm();
            setShowCreate(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Partner
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs text-slate-500">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PARTNER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => setFilterAlumni(!filterAlumni)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                filterAlumni
                  ? 'border-purple-300 bg-purple-50 text-purple-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Alumni Only
            </button>
            {(searchQuery || filterType || filterStatus || filterAlumni) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('');
                  setFilterStatus('');
                  setFilterAlumni(false);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              Partners ({pagination.total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Industry</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500">Status</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500">Verified</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500">Featured</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-500">Alumni</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-500">Tenants</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-500">Listings</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr
                    key={partner.id}
                    onClick={() => router.push(`/admin/network-partners/${partner.id}`)}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {partner.name}
                        </p>
                        <p className="text-xs text-slate-400">{partner.slug}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        variant="outline"
                        className={TYPE_COLORS[partner.type] || 'bg-slate-100 text-slate-700'}
                      >
                        {partner.type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                      {partner.industry || '--'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[partner.status] || ''}
                      >
                        {partner.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {partner.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {partner.featured ? (
                        <Star className="h-4 w-4 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {partner.isAlumniPartner ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 text-[10px]">
                          {partner.alumniInstitution || 'Alumni'}
                        </Badge>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      <span className="flex items-center justify-end gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {partner.stats.tenants}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      <span className="flex items-center justify-end gap-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {partner.stats.listings}
                      </span>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No partners found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || filterType || filterStatus || filterAlumni
                          ? 'Try adjusting your filters'
                          : 'Create your first network partner'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Partner Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Create Network Partner
            </DialogTitle>
            <DialogDescription>
              Add a new corporate or alumni partner to the shared network.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partner Name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="e.g. acme-corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="e.g. Technology"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Company Size</Label>
                <Input
                  value={newCompanySize}
                  onChange={(e) => setNewCompanySize(e.target.value)}
                  placeholder="e.g. 50-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Headquarters</Label>
              <Input
                value={newHeadquarters}
                onChange={(e) => setNewHeadquarters(e.target.value)}
                placeholder="e.g. New York, NY"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the partner organization..."
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Contact Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Primary Contact
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Alumni Section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setNewIsAlumni(!newIsAlumni)}
                className={`flex items-center justify-between w-full p-3 rounded-lg border transition-colors ${
                  newIsAlumni
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-left">
                  <GraduationCap className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">Alumni Partner</p>
                    <p className="text-xs text-slate-400">
                      This partner is connected to a specific institution&apos;s alumni network
                    </p>
                  </div>
                </div>
                <Badge
                  variant={newIsAlumni ? 'default' : 'outline'}
                  className={newIsAlumni ? 'bg-purple-100 text-purple-700 border-0' : ''}
                >
                  {newIsAlumni ? 'Yes' : 'No'}
                </Badge>
              </button>

              {newIsAlumni && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Input
                      value={newAlumniInstitution}
                      onChange={(e) => setNewAlumniInstitution(e.target.value)}
                      placeholder="e.g. Harvard University"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <Input
                      value={newAlumniSport}
                      onChange={(e) => setNewAlumniSport(e.target.value)}
                      placeholder="e.g. Basketball"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    <Input
                      type="number"
                      value={newAlumniGradYear}
                      onChange={(e) => setNewAlumniGradYear(e.target.value)}
                      placeholder="e.g. 2015"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input
                      value={newAlumniPosition}
                      onChange={(e) => setNewAlumniPosition(e.target.value)}
                      placeholder="e.g. Point Guard"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleCreate}
              disabled={creating || !newName || !newSlug}
            >
              {creating ? 'Creating...' : 'Create Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
