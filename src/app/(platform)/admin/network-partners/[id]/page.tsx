'use client';

/**
 * Network Partner Detail Page
 *
 * Edit partner profile, view tenant relationships, listing count,
 * manage status, and view alumni info.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Save,
  Star,
  Users,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Briefcase,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartnerDetail {
  id: string;
  linkedUserId: string | null;
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
  alumniGraduationYear: number | null;
  alumniPosition: string | null;
  alumniYearsOnTeam: string | null;
  status: string;
  visibility: string;
  verified: boolean;
  featured: boolean;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    tenants: number;
    listings: number;
    users: number;
    applications: number;
  };
}

interface PartnerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  role: string;
  status: string;
  isAlumni: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PartnerListing {
  id: string;
  title: string;
  status: string;
  category: string | null;
  isPaid: boolean;
  maxStudents: number;
  studentsAccepted: number;
  publishedAt: string | null;
  createdAt: string;
}

interface TenantRelation {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  tenantStatus: string;
  relationship: string;
  isActive: boolean;
  featuredInTenant: boolean;
  createdAt: string;
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

const VISIBILITY_OPTIONS = [
  { value: 'network', label: 'Network' },
  { value: 'private', label: 'Private' },
  { value: 'hybrid', label: 'Hybrid' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const LISTING_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-500',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  exclusive: 'bg-purple-100 text-purple-700',
  preferred: 'bg-blue-100 text-blue-700',
  network: 'bg-slate-100 text-slate-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkPartnerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [listings, setListings] = useState<PartnerListing[]>([]);
  const [tenantRelations, setTenantRelations] = useState<TenantRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [error, setError] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editType, setEditType] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCompanySize, setEditCompanySize] = useState('');
  const [editHeadquarters, setEditHeadquarters] = useState('');
  const [editVisibility, setEditVisibility] = useState('network');
  const [editVerified, setEditVerified] = useState(false);
  const [editFeatured, setEditFeatured] = useState(false);
  const [editContactName, setEditContactName] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

  // Alumni fields
  const [editIsAlumni, setEditIsAlumni] = useState(false);
  const [editAlumniInstitution, setEditAlumniInstitution] = useState('');
  const [editAlumniSport, setEditAlumniSport] = useState('');
  const [editAlumniGradYear, setEditAlumniGradYear] = useState('');
  const [editAlumniPosition, setEditAlumniPosition] = useState('');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchPartner = useCallback(async () => {
    try {
      const [partnerRes, tenantsRes] = await Promise.all([
        fetch(`/api/admin/network-partners/${id}`),
        fetch(`/api/admin/network-partners/${id}/tenants`),
      ]);

      if (partnerRes.ok) {
        const data = await partnerRes.json();
        setPartner(data.partner);
        setUsers(data.users || []);
        setListings(data.recentListings || []);
        populateForm(data.partner);
      }
      if (tenantsRes.ok) {
        const tData = await tenantsRes.json();
        setTenantRelations(tData.tenants || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load partner details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  const populateForm = (p: PartnerDetail) => {
    setEditName(p.name);
    setEditSlug(p.slug);
    setEditType(p.type);
    setEditIndustry(p.industry || '');
    setEditWebsite(p.website || '');
    setEditDescription(p.description || '');
    setEditCompanySize(p.companySize || '');
    setEditHeadquarters(p.headquarters || '');
    setEditVisibility(p.visibility);
    setEditVerified(p.verified);
    setEditFeatured(p.featured);
    setEditContactName(p.primaryContactName || '');
    setEditContactEmail(p.primaryContactEmail || '');
    setEditContactPhone(p.primaryContactPhone || '');
    setEditIsAlumni(p.isAlumniPartner);
    setEditAlumniInstitution(p.alumniInstitution || '');
    setEditAlumniSport(p.alumniSport || '');
    setEditAlumniGradYear(p.alumniGraduationYear ? String(p.alumniGraduationYear) : '');
    setEditAlumniPosition(p.alumniPosition || '');
  };

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch(`/api/admin/network-partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          type: editType,
          industry: editIndustry || null,
          website: editWebsite || null,
          description: editDescription || null,
          companySize: editCompanySize || null,
          headquarters: editHeadquarters || null,
          visibility: editVisibility,
          verified: editVerified,
          featured: editFeatured,
          primaryContactName: editContactName || null,
          primaryContactEmail: editContactEmail || null,
          primaryContactPhone: editContactPhone || null,
          isAlumniPartner: editIsAlumni,
          alumniInstitution: editIsAlumni ? editAlumniInstitution || null : null,
          alumniSport: editIsAlumni ? editAlumniSport || null : null,
          alumniGraduationYear: editIsAlumni && editAlumniGradYear
            ? Number(editAlumniGradYear)
            : null,
          alumniPosition: editIsAlumni ? editAlumniPosition || null : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchPartner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Status management
  // ---------------------------------------------------------------------------

  const handleActivate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/network-partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) fetchPartner();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/network-partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      });
      if (res.ok) {
        setShowSuspend(false);
        fetchPartner();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuspending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-20">
        <Globe className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Partner not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/network-partners')}
        >
          Back to Partners
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/network-partners')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {partner.name}
              </h1>
              <Badge className={`border-0 ${STATUS_COLORS[partner.status] || ''}`}>
                {partner.status}
              </Badge>
              {partner.verified && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {partner.featured && (
                <Star className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              {partner.slug}
              {partner.website && (
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex ml-2 text-teal-600 hover:text-teal-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {partner.status === 'suspended' || partner.status === 'pending' ? (
            <Button
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={handleActivate}
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Activate
            </Button>
          ) : partner.status === 'active' ? (
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowSuspend(true)}
            >
              <XCircle className="h-4 w-4 mr-2" /> Suspend
            </Button>
          ) : null}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tenants', value: partner.stats.tenants, icon: Building2, color: 'text-blue-600' },
          { label: 'Listings', value: partner.stats.listings, icon: FileText, color: 'text-teal-600' },
          { label: 'Users', value: partner.stats.users, icon: Users, color: 'text-amber-600' },
          { label: 'Applications', value: partner.stats.applications, icon: Briefcase, color: 'text-purple-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Edit form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Partner Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-teal-600" /> Partner Profile
              </CardTitle>
              <CardDescription>Edit partner details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={editSlug}
                    onChange={(e) =>
                      setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
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
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Input
                    value={editCompanySize}
                    onChange={(e) => setEditCompanySize(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Headquarters</Label>
                <Input
                  value={editHeadquarters}
                  onChange={(e) => setEditHeadquarters(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={editVisibility} onValueChange={setEditVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggle flags */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditVerified(!editVerified)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    editVerified
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Verified</span>
                  </div>
                  <Badge
                    variant={editVerified ? 'default' : 'outline'}
                    className={editVerified ? 'bg-green-100 text-green-700 border-0' : ''}
                  >
                    {editVerified ? 'Yes' : 'No'}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => setEditFeatured(!editFeatured)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    editFeatured
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">Featured</span>
                  </div>
                  <Badge
                    variant={editFeatured ? 'default' : 'outline'}
                    className={editFeatured ? 'bg-amber-100 text-amber-700 border-0' : ''}
                  >
                    {editFeatured ? 'Yes' : 'No'}
                  </Badge>
                </button>
              </div>

              {/* Contact Info */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Primary Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {saved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />{' '}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alumni Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" /> Alumni Information
              </CardTitle>
              <CardDescription>
                Alumni connection details for this partner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={() => setEditIsAlumni(!editIsAlumni)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  editIsAlumni
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-slate-200'
                }`}
              >
                <span className="text-sm font-medium">This is an alumni partner</span>
                <Badge
                  variant={editIsAlumni ? 'default' : 'outline'}
                  className={editIsAlumni ? 'bg-purple-100 text-purple-700 border-0' : ''}
                >
                  {editIsAlumni ? 'Yes' : 'No'}
                </Badge>
              </button>

              {editIsAlumni && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Input
                      value={editAlumniInstitution}
                      onChange={(e) => setEditAlumniInstitution(e.target.value)}
                      placeholder="e.g. Harvard University"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <Input
                      value={editAlumniSport}
                      onChange={(e) => setEditAlumniSport(e.target.value)}
                      placeholder="e.g. Basketball"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    <Input
                      type="number"
                      value={editAlumniGradYear}
                      onChange={(e) => setEditAlumniGradYear(e.target.value)}
                      placeholder="e.g. 2015"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input
                      value={editAlumniPosition}
                      onChange={(e) => setEditAlumniPosition(e.target.value)}
                      placeholder="e.g. Point Guard"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end">
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Tenant Relationships */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" /> Tenant Access
              </CardTitle>
              <CardDescription>
                {tenantRelations.length} tenant relationship{tenantRelations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenantRelations.length === 0 ? (
                <p className="text-sm text-slate-400">No tenant relationships</p>
              ) : (
                tenantRelations.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {rel.tenantName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rel.tenantSubdomain}.campus2career.com
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={RELATIONSHIP_COLORS[rel.relationship] || ''}
                      >
                        {rel.relationship}
                      </Badge>
                      {!rel.isActive && (
                        <Badge variant="outline" className="bg-red-50 text-red-600 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" /> Recent Listings
              </CardTitle>
              <CardDescription>
                {partner.stats.listings} total listing{partner.stats.listings !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {listings.length === 0 ? (
                <p className="text-sm text-slate-400">No listings yet</p>
              ) : (
                listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {listing.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {listing.studentsAccepted}/{listing.maxStudents} students
                        {listing.category && ` - ${listing.category}`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={LISTING_STATUS_COLORS[listing.status] || ''}
                    >
                      {listing.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Partner Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" /> Partner Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-slate-400">No users</p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                      {u.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {u.role}
                      </Badge>
                      {u.isAlumni && (
                        <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(partner.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(partner.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID</span>
                <span className="text-xs font-mono text-slate-400 truncate max-w-[180px]">
                  {partner.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={showSuspend} onOpenChange={setShowSuspend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" /> Suspend Partner
            </DialogTitle>
            <DialogDescription>
              Suspending <strong>{partner.name}</strong> will prevent it from appearing
              in the shared network. Existing tenant relationships will remain but become
              inactive.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>This will affect:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{partner.stats.tenants} tenant relationship{partner.stats.tenants !== 1 ? 's' : ''}</li>
              <li>{partner.stats.listings} listing{partner.stats.listings !== 1 ? 's' : ''}</li>
              <li>{partner.stats.users} partner user{partner.stats.users !== 1 ? 's' : ''}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspend(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSuspend}
              disabled={suspending}
            >
              {suspending ? 'Suspending...' : 'Suspend Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
