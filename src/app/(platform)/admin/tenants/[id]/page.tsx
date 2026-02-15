'use client';

/**
 * Tenant Detail Page — Admin view of a single tenant
 *
 * Shows: Stats, branding preview, feature toggles, admin users,
 * recent activity, and suspend/reactivate controls.
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
  ArrowLeft,
  Building2,
  Check,
  Crown,
  ExternalLink,
  GraduationCap,
  Briefcase,
  FileText,
  Layers,
  Palette,
  Save,
  Shield,
  Users,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Trophy,
  Globe,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface TenantDetail {
  id: string;
  subdomain: string;
  name: string;
  displayName: string | null;
  status: string;
  institutionDomain: string | null;
  branding: Record<string, string>;
  features: Record<string, unknown>;
  marketplaceType: string;
  sport: string | null;
  teamName: string | null;
  conference: string | null;
  sharedNetworkEnabled: boolean;
  networkTier: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    students: number;
    corporates: number;
    admins: number;
    listings: number;
    applications: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RecentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function TenantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspending, setSuspending] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('#0F766E');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#C8A951');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editAllowedDomains, setEditAllowedDomains] = useState('');
  // Athletic & network fields
  const [editMarketplaceType, setEditMarketplaceType] = useState<'institution' | 'athletic'>('institution');
  const [editSport, setEditSport] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editConference, setEditConference] = useState('');
  const [editSharedNetwork, setEditSharedNetwork] = useState(false);
  const [editNetworkTier, setEditNetworkTier] = useState<'basic' | 'full'>('basic');

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      const data = await res.json();
      if (res.ok) {
        setTenant(data.tenant);
        setAdmins(data.admins || []);
        setRecentUsers(data.recentUsers || []);
        // Populate edit fields
        setEditName(data.tenant.name);
        setEditDisplayName(data.tenant.displayName || '');
        setEditPrimaryColor(data.tenant.branding?.primaryColor || '#0F766E');
        setEditSecondaryColor(data.tenant.branding?.secondaryColor || '#C8A951');
        setEditLogoUrl(data.tenant.branding?.logoUrl || '');
        const features = (data.tenant.features || {}) as Record<string, unknown>;
        const domains = (features.allowedDomains || []) as string[];
        setEditAllowedDomains(domains.join(', '));
        // Athletic fields
        setEditMarketplaceType((data.tenant.marketplaceType as 'institution' | 'athletic') || 'institution');
        setEditSport(data.tenant.sport || '');
        setEditTeamName(data.tenant.teamName || '');
        setEditConference(data.tenant.conference || '');
        setEditSharedNetwork(data.tenant.sharedNetworkEnabled || false);
        setEditNetworkTier((data.tenant.networkTier as 'basic' | 'full') || 'basic');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const domainsArray = editAllowedDomains
        ? editAllowedDomains.split(',').map((d: string) => d.trim()).filter(Boolean)
        : [];
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          displayName: editDisplayName,
          branding: {
            primaryColor: editPrimaryColor,
            secondaryColor: editSecondaryColor,
            logoUrl: editLogoUrl || undefined,
          },
          features: {
            allowedDomains: domainsArray,
          },
          marketplaceType: editMarketplaceType,
          sport: editSport || null,
          teamName: editTeamName || null,
          conference: editConference || null,
          sharedNetworkEnabled: editSharedNetwork,
          networkTier: editNetworkTier,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchTenant();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowSuspend(false);
        fetchTenant();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) fetchTenant();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-500',
    suspended: 'bg-red-100 text-red-700',
  };

  const roleIcons: Record<string, React.ReactNode> = {
    student: <GraduationCap className="h-3.5 w-3.5" />,
    corporate_partner: <Briefcase className="h-3.5 w-3.5" />,
    educational_admin: <Shield className="h-3.5 w-3.5" />,
    admin: <Crown className="h-3.5 w-3.5" />,
  };

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

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Tenant not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/tenants')}>
          Back to Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tenants')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{tenant.name}</h1>
              <Badge className={`border-0 ${statusColors[tenant.status] || ''}`}>{tenant.status}</Badge>
            </div>
            <p className="text-slate-500 mt-1 font-mono text-sm">
              /{tenant.subdomain}
              <a
                href={`/${tenant.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex ml-2 text-teal-600 hover:text-teal-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tenant.status === 'suspended' ? (
            <Button
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={handleReactivate}
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowSuspend(true)}
            >
              <XCircle className="h-4 w-4 mr-2" /> Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Students', value: tenant.stats.students, icon: GraduationCap, color: 'text-blue-600' },
          { label: 'Corporates', value: tenant.stats.corporates, icon: Briefcase, color: 'text-teal-600' },
          { label: 'Admins', value: tenant.stats.admins, icon: Shield, color: 'text-amber-600' },
          { label: 'Listings', value: tenant.stats.listings, icon: FileText, color: 'text-purple-600' },
          { label: 'Applications', value: tenant.stats.applications, icon: Layers, color: 'text-pink-600' },
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
        {/* Left column: Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-teal-600" /> Settings & Branding
              </CardTitle>
              <CardDescription>Update tenant name, display name, and brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed Email Domains</Label>
                <Input
                  value={editAllowedDomains}
                  onChange={(e) => setEditAllowedDomains(e.target.value.toLowerCase())}
                  placeholder="harvard.edu, fas.harvard.edu"
                />
                <p className="text-xs text-slate-400">
                  Comma-separated. Students must register with one of these email domains. Leave empty to allow any email.
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brand Colors</Label>
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editPrimaryColor}
                      onChange={(e) => setEditPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <div>
                      <p className="text-xs text-slate-500">Primary</p>
                      <p className="text-xs font-mono text-slate-400">{editPrimaryColor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editSecondaryColor}
                      onChange={(e) => setEditSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <div>
                      <p className="text-xs text-slate-500">Secondary</p>
                      <p className="text-xs font-mono text-slate-400">{editSecondaryColor}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Preview */}
              <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: editPrimaryColor }}
                  >
                    {(editDisplayName || editName || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: editPrimaryColor }}>
                      {editDisplayName || editName}
                    </p>
                    <p className="text-xs" style={{ color: editSecondaryColor }}>
                      Powered by Campus2Career
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {saved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Athletic Program & Network */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-600" /> Athletic Program & Network
              </CardTitle>
              <CardDescription>
                Designate this tenant as an athletic program and configure shared network access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Marketplace Type Toggle */}
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Marketplace Type</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value: 'institution' as const, label: 'Standard Institution', desc: 'University, college, or training program', icon: Building2 },
                    { value: 'athletic' as const, label: 'Athletic Program', desc: 'Sports team with alumni network', icon: Trophy },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isActive = editMarketplaceType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setEditMarketplaceType(opt.value);
                          if (opt.value === 'athletic') {
                            setEditSharedNetwork(true);
                            setEditNetworkTier('full');
                          }
                        }}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                          <p className={`font-semibold text-sm ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                            {opt.label}
                          </p>
                          {isActive && <Check className="h-4 w-4 text-purple-600 ml-auto" />}
                        </div>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Athletic Fields (shown when Athletic is selected) */}
              {editMarketplaceType === 'athletic' && (
                <div className="space-y-4 p-4 rounded-lg bg-purple-50/50 border border-purple-100 dark:bg-purple-900/10 dark:border-purple-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Athletic Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Sport</Label>
                      <select
                        value={editSport}
                        onChange={(e) => setEditSport(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="">Select sport...</option>
                        {['Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field', 'Swimming', 'Lacrosse', 'Hockey', 'Tennis', 'Volleyball', 'Wrestling', 'Softball', 'Golf', 'Rowing', 'Other'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Team Name</Label>
                      <Input
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        placeholder="e.g. Crusaders"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conference</Label>
                      <Input
                        value={editConference}
                        onChange={(e) => setEditConference(e.target.value)}
                        placeholder="e.g. Patriot League"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Network Settings */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Shared Network</p>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Globe className={`h-5 w-5 ${editSharedNetwork ? 'text-green-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Shared Network Enabled</p>
                      <p className="text-xs text-slate-400">Allow this tenant to access the cross-institutional partner network</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditSharedNetwork(!editSharedNetwork)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editSharedNetwork ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editSharedNetwork ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {editSharedNetwork && (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm whitespace-nowrap">Network Tier</Label>
                    <select
                      value={editNetworkTier}
                      onChange={(e) => setEditNetworkTier(e.target.value as 'basic' | 'full')}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="basic">Basic — Limited network access</option>
                      <option value="full">Full — Complete network access</option>
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Plan & Features
              </CardTitle>
              <CardDescription>
                Assign or upgrade the tenant&apos;s plan. Toggling a plan will automatically enable/disable the corresponding features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    plan: 'starter',
                    label: 'Starter',
                    description: '100 students, 10 listings, basic features',
                    features: { maxStudents: 100, maxListings: 10, aiCoaching: true, customBranding: false, analytics: false, apiAccess: false, advancedReporting: false, studentRatings: false, corporateRatings: false, matchingAlgorithm: false, issueReporting: false, inviteManagement: true, aiMatchInsights: false, aiDiffView: false, aiProjectScoping: false, aiPortfolioIntelligence: false, aiTalentInsights: false },
                  },
                  {
                    plan: 'professional',
                    label: 'Professional',
                    description: '500 students, 50 listings, full features',
                    features: { maxStudents: 500, maxListings: 50, aiCoaching: true, customBranding: true, analytics: true, apiAccess: false, advancedReporting: true, studentRatings: true, corporateRatings: true, matchingAlgorithm: true, issueReporting: true, inviteManagement: true, aiMatchInsights: true, aiDiffView: true, aiProjectScoping: true, aiPortfolioIntelligence: false, aiTalentInsights: false },
                  },
                  {
                    plan: 'enterprise',
                    label: 'Enterprise',
                    description: 'Unlimited, all features + API',
                    features: { maxStudents: -1, maxListings: -1, aiCoaching: true, customBranding: true, analytics: true, apiAccess: true, advancedReporting: true, studentRatings: true, corporateRatings: true, matchingAlgorithm: true, issueReporting: true, inviteManagement: true, aiMatchInsights: true, aiDiffView: true, aiProjectScoping: true, aiPortfolioIntelligence: true, aiTalentInsights: true },
                  },
                ].map((p) => {
                  const currentPlan = ((tenant.features as Record<string, unknown>)?.plan as string) || 'starter';
                  const isActive = currentPlan === p.plan;
                  return (
                    <button
                      key={p.plan}
                      onClick={async () => {
                        if (isActive) return;
                        setSaving(true);
                        try {
                          const res = await fetch(`/api/admin/tenants/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              features: { ...p.features, plan: p.plan, upgradeRequestPending: false },
                            }),
                          });
                          if (res.ok) {
                            setSaved(true);
                            setTimeout(() => setSaved(false), 3000);
                            fetchTenant();
                          }
                        } catch (err) { console.error(err); }
                        finally { setSaving(false); }
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                      disabled={saving}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                          {p.label}
                        </p>
                        {isActive && <Check className="h-4 w-4 text-teal-600" />}
                      </div>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Upgrade Request Indicator */}
              {(tenant.features as Record<string, unknown>)?.upgradeRequestPending ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Crown className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Upgrade Requested</p>
                    <p className="text-xs text-amber-600">
                      This tenant has requested a plan upgrade to{' '}
                      <strong>{String((tenant.features as Record<string, unknown>)?.requestedPlan || 'professional')}</strong>.
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0">Pending</Badge>
                </div>
              ) : null}

              {/* Feature Toggles */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Individual Feature Overrides</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Toggle individual features regardless of plan level. Changes take effect immediately.
                  </p>
                </div>

                {/* Core Platform Features */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Core Platform</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'aiCoaching', label: 'AI Coaching' },
                      { key: 'customBranding', label: 'Custom Branding' },
                      { key: 'analytics', label: 'Analytics' },
                      { key: 'apiAccess', label: 'API Access' },
                      { key: 'inviteManagement', label: 'Invite Management' },
                    ].map((feat) => {
                      const features = (tenant.features || {}) as Record<string, unknown>;
                      const enabled = !!features[feat.key];
                      return (
                        <button
                          key={feat.key}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const res = await fetch(`/api/admin/tenants/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  features: { [feat.key]: !enabled },
                                }),
                              });
                              if (res.ok) fetchTenant();
                            } catch (err) { console.error(err); }
                            finally { setSaving(false); }
                          }}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            enabled ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
                          }`}
                          disabled={saving}
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">{feat.label}</span>
                          <Badge
                            variant={enabled ? 'default' : 'outline'}
                            className={enabled ? 'bg-green-100 text-green-700 border-0' : ''}
                          >
                            {enabled ? 'On' : 'Off'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Premium Reporting & Ratings */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Premium Reporting & Ratings</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'advancedReporting', label: 'Advanced Reporting', desc: 'Top students, leaderboards' },
                      { key: 'studentRatings', label: 'Student Ratings', desc: 'Private student performance' },
                      { key: 'corporateRatings', label: 'Corporate Ratings', desc: 'Public partner reviews' },
                      { key: 'matchingAlgorithm', label: 'Smart Matching', desc: 'AI skill alignment' },
                      { key: 'issueReporting', label: 'Issue Reporting', desc: 'Safety & compliance' },
                    ].map((feat) => {
                      const features = (tenant.features || {}) as Record<string, unknown>;
                      const enabled = !!features[feat.key];
                      return (
                        <button
                          key={feat.key}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const res = await fetch(`/api/admin/tenants/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  features: { [feat.key]: !enabled },
                                }),
                              });
                              if (res.ok) fetchTenant();
                            } catch (err) { console.error(err); }
                            finally { setSaving(false); }
                          }}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            enabled ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
                          }`}
                          disabled={saving}
                        >
                          <div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{feat.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{feat.desc}</p>
                          </div>
                          <Badge
                            variant={enabled ? 'default' : 'outline'}
                            className={enabled ? 'bg-green-100 text-green-700 border-0' : ''}
                          >
                            {enabled ? 'On' : 'Off'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Features */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">AI Features</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'aiMatchInsights', label: 'Match Insights', desc: 'AI match analysis' },
                      { key: 'aiDiffView', label: 'AI Diff View', desc: 'Resume improvements' },
                      { key: 'aiProjectScoping', label: 'Project Scoping', desc: 'AI project review' },
                      { key: 'aiPortfolioIntelligence', label: 'Portfolio Intelligence', desc: 'Enterprise analytics' },
                      { key: 'aiTalentInsights', label: 'Talent Insights', desc: 'Industry analysis' },
                    ].map((feat) => {
                      const features = (tenant.features || {}) as Record<string, unknown>;
                      const enabled = !!features[feat.key];
                      return (
                        <button
                          key={feat.key}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const res = await fetch(`/api/admin/tenants/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  features: { [feat.key]: !enabled },
                                }),
                              });
                              if (res.ok) fetchTenant();
                            } catch (err) { console.error(err); }
                            finally { setSaving(false); }
                          }}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            enabled ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
                          }`}
                          disabled={saving}
                        >
                          <div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{feat.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{feat.desc}</p>
                          </div>
                          <Badge
                            variant={enabled ? 'default' : 'outline'}
                            className={enabled ? 'bg-green-100 text-green-700 border-0' : ''}
                          >
                            {enabled ? 'On' : 'Off'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Max Students</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {Number((tenant.features as Record<string, unknown>)?.maxStudents) === -1 ? 'Unlimited' : String((tenant.features as Record<string, unknown>)?.maxStudents || 100)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Max Listings</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {Number((tenant.features as Record<string, unknown>)?.maxListings) === -1 ? 'Unlimited' : String((tenant.features as Record<string, unknown>)?.maxListings || 10)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Admins + Recent Activity */}
        <div className="space-y-6">
          {/* Admins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" /> Admins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {admins.length === 0 ? (
                <p className="text-sm text-slate-400">No admins yet</p>
              ) : (
                admins.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                      {a.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {a.firstName} {a.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{a.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {a.lastLoginAt
                          ? `Last login ${new Date(a.lastLoginAt).toLocaleDateString()}`
                          : 'Never logged in'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" /> Recent Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-slate-400">No users yet</p>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 py-1.5">
                    <span className="text-slate-400">{roleIcons[u.role] || <Users className="h-3.5 w-3.5" />}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                      {u.firstName} {u.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {u.role.replace('_', ' ')}
                    </Badge>
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
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(tenant.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {tenant.institutionDomain && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Domain</span>
                  <span className="text-slate-700 dark:text-slate-300">{tenant.institutionDomain}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID</span>
                <span className="text-xs font-mono text-slate-400 truncate max-w-[180px]">{tenant.id}</span>
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
              <AlertTriangle className="h-5 w-5" /> Suspend Tenant
            </DialogTitle>
            <DialogDescription>
              Suspending <strong>{tenant.name}</strong> will immediately prevent all users
              from accessing the platform. This action can be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>This will affect:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{tenant.stats.students} students</li>
              <li>{tenant.stats.corporates} corporate partners</li>
              <li>{tenant.stats.admins} admins</li>
              <li>{tenant.stats.listings} active listings</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspend(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSuspend}
              disabled={suspending}
            >
              {suspending ? 'Suspending...' : 'Suspend Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
