'use client';

/**
 * Subscription Tier Definition Editor
 *
 * Displays 3 tier cards (Starter, Professional, Enterprise) side-by-side.
 * Clicking a card opens a modal editor with grouped sections for configuring
 * all tier settings including pricing, limits, AI config, features, and branding.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
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
  Crown,
  Check,
  Save,
  Settings,
  Sparkles,
  Users,
  Building2,
  Layers,
  Palette,
  Globe,
  AlertTriangle,
  Pencil,
  GraduationCap,
  Brain,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierData {
  id: string;
  name: string;
  displayName: string | null;
  sortOrder: number | null;
  maxUsers: number | null;
  maxProjects: number | null;
  maxActiveProjects: number | null;
  aiConfig: Record<string, unknown> | null;
  networkConfig: Record<string, unknown> | null;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  features: Record<string, unknown> | null;
  brandingConfig: Record<string, unknown> | null;
  isActive: boolean;
  tenantCount: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  starter: 'border-slate-300 bg-slate-50',
  professional: 'border-blue-300 bg-blue-50',
  enterprise: 'border-purple-300 bg-purple-50',
};

const TIER_BADGE_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <Layers className="h-6 w-6 text-slate-600" />,
  professional: <Building2 className="h-6 w-6 text-blue-600" />,
  enterprise: <Crown className="h-6 w-6 text-purple-600" />,
};

const MODEL_OPTIONS = [
  { value: 'claude-haiku-4-5-20250901', label: 'Claude Haiku 4.5' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(cents: number | null): string {
  if (cents == null || cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatLimit(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  if (value === -1) return 'Unlimited';
  return String(value);
}

function shortModel(model: string | undefined): string {
  if (!model) return 'Not set';
  if (model.includes('haiku')) return 'Haiku 4.5';
  if (model.includes('sonnet')) return 'Sonnet 4';
  return model;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TiersPage() {
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTier, setEditingTier] = useState<TierData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  // Edit form state
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState('0');
  const [formAnnualPrice, setFormAnnualPrice] = useState('0');
  const [formMaxUsers, setFormMaxUsers] = useState('0');
  const [formMaxProjects, setFormMaxProjects] = useState('0');
  const [formMaxActiveProjects, setFormMaxActiveProjects] = useState('0');

  // AI Config form
  const [formAiModel, setFormAiModel] = useState('');
  const [formAiMaxTokens, setFormAiMaxTokens] = useState('');
  const [formAiStreaming, setFormAiStreaming] = useState(false);
  const [formAiMonthlyUses, setFormAiMonthlyUses] = useState('');

  // Student Coaching form
  const [formCoachingInteractions, setFormCoachingInteractions] = useState('');
  const [formResumeReviews, setFormResumeReviews] = useState('');
  const [formCoverLetters, setFormCoverLetters] = useState('');
  const [formSessionLength, setFormSessionLength] = useState('');

  // Enterprise feature toggles
  const [formPortfolioIntelligence, setFormPortfolioIntelligence] = useState(false);
  const [formTalentInsights, setFormTalentInsights] = useState(false);
  const [formInstitutionalAnalytics, setFormInstitutionalAnalytics] = useState(false);

  // Features JSONB toggles
  const [formFeatures, setFormFeatures] = useState<Record<string, boolean>>({});

  // Branding JSONB toggles
  const [formBranding, setFormBranding] = useState<Record<string, boolean>>({});

  // Network config
  const [formNetworkEnabled, setFormNetworkEnabled] = useState(false);
  const [formNetworkMaxPartners, setFormNetworkMaxPartners] = useState('');
  const [formNetworkMaxApplications, setFormNetworkMaxApplications] = useState('');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tiers');
      if (!res.ok) throw new Error('Failed to fetch tiers');
      const data = await res.json();
      setTiers(data.tiers || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load subscription tiers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // ---------------------------------------------------------------------------
  // Edit handlers
  // ---------------------------------------------------------------------------

  const openEditor = (tier: TierData) => {
    setEditingTier(tier);
    setActiveSection('general');
    setSaved(false);

    // General
    setFormDisplayName(tier.displayName || '');
    setFormSortOrder(String(tier.sortOrder ?? 0));
    setFormMonthlyPrice(String(tier.monthlyPriceCents ?? 0));
    setFormAnnualPrice(String(tier.annualPriceCents ?? 0));
    setFormMaxUsers(String(tier.maxUsers ?? 0));
    setFormMaxProjects(String(tier.maxProjects ?? 0));
    setFormMaxActiveProjects(String(tier.maxActiveProjects ?? 0));

    // AI Config
    const ai = (tier.aiConfig || {}) as Record<string, unknown>;
    setFormAiModel((ai.model as string) || '');
    setFormAiMaxTokens(String(ai.maxTokens ?? ai.max_tokens ?? ''));
    setFormAiStreaming(!!ai.streaming);
    setFormAiMonthlyUses(String(ai.monthlyInteractionsPerUser ?? ai.monthly_interactions_per_user ?? ''));

    // Student Coaching
    setFormCoachingInteractions(String(ai.coachingInteractions ?? ai.coaching_interactions ?? ''));
    setFormResumeReviews(String(ai.resumeReviews ?? ai.resume_reviews ?? ''));
    setFormCoverLetters(String(ai.coverLetters ?? ai.cover_letters ?? ''));
    setFormSessionLength(String(ai.sessionLength ?? ai.session_length ?? ''));

    // Enterprise features
    const features = (tier.features || {}) as Record<string, unknown>;
    setFormPortfolioIntelligence(!!features.portfolioIntelligence);
    setFormTalentInsights(!!features.talentInsights);
    setFormInstitutionalAnalytics(!!features.institutionalAnalytics);

    // Features toggles
    const featureToggles: Record<string, boolean> = {};
    const featureKeys = [
      'aiCoaching', 'customBranding', 'analytics', 'apiAccess',
      'advancedReporting', 'studentRatings', 'corporateRatings',
      'matchingAlgorithm', 'issueReporting', 'inviteManagement',
      'aiMatchInsights', 'aiDiffView', 'aiProjectScoping',
    ];
    featureKeys.forEach((key) => {
      featureToggles[key] = !!features[key];
    });
    setFormFeatures(featureToggles);

    // Branding config
    const branding = (tier.brandingConfig || {}) as Record<string, unknown>;
    const brandingToggles: Record<string, boolean> = {};
    const brandingKeys = ['customColors', 'customLogo', 'customFavicon', 'heroVideo', 'galleryImages', 'socialLinks'];
    brandingKeys.forEach((key) => {
      brandingToggles[key] = !!branding[key];
    });
    setFormBranding(brandingToggles);

    // Network config
    const network = (tier.networkConfig || {}) as Record<string, unknown>;
    setFormNetworkEnabled(!!network.enabled);
    setFormNetworkMaxPartners(String(network.maxPartners ?? network.max_partners ?? ''));
    setFormNetworkMaxApplications(String(network.maxApplicationsPerMonth ?? network.max_applications_per_month ?? ''));
  };

  const handleSave = async () => {
    if (!editingTier) return;
    setSaving(true);
    setSaved(false);

    try {
      const body = {
        displayName: formDisplayName,
        sortOrder: Number(formSortOrder) || 0,
        monthlyPriceCents: Number(formMonthlyPrice) || 0,
        annualPriceCents: Number(formAnnualPrice) || 0,
        maxUsers: Number(formMaxUsers) || 0,
        maxProjects: Number(formMaxProjects) || 0,
        maxActiveProjects: Number(formMaxActiveProjects) || 0,
        aiConfig: {
          model: formAiModel || undefined,
          maxTokens: formAiMaxTokens ? Number(formAiMaxTokens) : undefined,
          streaming: formAiStreaming,
          monthlyInteractionsPerUser: formAiMonthlyUses ? Number(formAiMonthlyUses) : undefined,
          coachingInteractions: formCoachingInteractions ? Number(formCoachingInteractions) : undefined,
          resumeReviews: formResumeReviews ? Number(formResumeReviews) : undefined,
          coverLetters: formCoverLetters ? Number(formCoverLetters) : undefined,
          sessionLength: formSessionLength ? Number(formSessionLength) : undefined,
        },
        features: {
          ...formFeatures,
          portfolioIntelligence: formPortfolioIntelligence,
          talentInsights: formTalentInsights,
          institutionalAnalytics: formInstitutionalAnalytics,
        },
        brandingConfig: formBranding,
        networkConfig: {
          enabled: formNetworkEnabled,
          maxPartners: formNetworkMaxPartners ? Number(formNetworkMaxPartners) : undefined,
          maxApplicationsPerMonth: formNetworkMaxApplications ? Number(formNetworkMaxApplications) : undefined,
        },
      };

      const res = await csrfFetch(`/api/admin/tiers/${editingTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save tier');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchTiers();
    } catch (err) {
      console.error(err);
      setError('Failed to save tier changes.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const sections = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'ai', label: 'AI Configuration', icon: Brain },
    { key: 'coaching', label: 'Student Coaching', icon: GraduationCap },
    { key: 'enterprise', label: 'Enterprise Features', icon: Crown },
    { key: 'network', label: 'Network Access', icon: Globe },
    { key: 'features', label: 'Features', icon: Layers },
    { key: 'branding', label: 'Branding', icon: Palette },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Crown className="h-7 w-7 text-amber-500" />
          Subscription Tiers
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage tier definitions, pricing, limits, and feature configurations
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const ai = (tier.aiConfig || {}) as Record<string, unknown>;
          const features = (tier.features || {}) as Record<string, unknown>;
          const enabledFeatures = Object.entries(features).filter(
            ([, v]) => v === true
          );

          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer hover:shadow-lg transition-shadow ${
                TIER_COLORS[tier.name] || 'border-slate-200'
              }`}
              onClick={() => openEditor(tier)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {TIER_ICONS[tier.name] || <Layers className="h-6 w-6 text-slate-500" />}
                    <div>
                      <CardTitle className="text-lg">
                        {tier.displayName || tier.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {tier.name}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(tier.monthlyPriceCents)}
                  </span>
                  <span className="text-sm text-slate-500">/mo</span>
                  {tier.annualPriceCents ? (
                    <span className="text-xs text-slate-400 ml-2">
                      ({formatPrice(tier.annualPriceCents)}/yr)
                    </span>
                  ) : null}
                </div>

                {/* Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Users</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatLimit(tier.maxUsers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Projects</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatLimit(tier.maxProjects)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Projects</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatLimit(tier.maxActiveProjects)}
                    </span>
                  </div>
                </div>

                {/* AI Info */}
                <div className="rounded-lg bg-white dark:bg-slate-800 border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Sparkles className="h-3 w-3" /> AI Configuration
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Model</span>
                    <span className="font-medium">{shortModel(ai.model as string)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Monthly Uses</span>
                    <span className="font-medium">
                      {formatLimit(
                        (ai.monthlyInteractionsPerUser ?? ai.monthly_interactions_per_user) as number | undefined
                      )}
                    </span>
                  </div>
                </div>

                {/* Features Summary */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Features ({enabledFeatures.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {enabledFeatures.slice(0, 6).map(([key]) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                    {enabledFeatures.length > 6 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{enabledFeatures.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tenant Count */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>{tier.tenantCount}</strong> tenant{tier.tenantCount !== 1 ? 's' : ''} on this tier
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tiers.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Crown className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No subscription tiers defined</p>
            <p className="text-sm text-slate-400 mt-1">
              Create tiers in the database to manage subscription plans
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTier && (TIER_ICONS[editingTier.name] || <Settings className="h-5 w-5" />)}
              Edit {editingTier?.displayName || editingTier?.name} Tier
            </DialogTitle>
            <DialogDescription>
              Configure tier settings. Changes affect {editingTier?.tenantCount || 0} tenant
              {editingTier?.tenantCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          {/* Section tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 pb-1">
            {sections.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  activeSection === key
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* General Section */}
          {activeSection === 'general' && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="e.g. Professional Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price (cents)</Label>
                  <Input
                    type="number"
                    value={formMonthlyPrice}
                    onChange={(e) => setFormMonthlyPrice(e.target.value)}
                    min={0}
                  />
                  <p className="text-xs text-slate-400">
                    {formatPrice(Number(formMonthlyPrice) || 0)}/mo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Annual Price (cents)</Label>
                  <Input
                    type="number"
                    value={formAnnualPrice}
                    onChange={(e) => setFormAnnualPrice(e.target.value)}
                    min={0}
                  />
                  <p className="text-xs text-slate-400">
                    {formatPrice(Number(formAnnualPrice) || 0)}/yr
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={formMaxUsers}
                    onChange={(e) => setFormMaxUsers(e.target.value)}
                    min={-1}
                  />
                  <p className="text-xs text-slate-400">-1 = unlimited</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Projects</Label>
                  <Input
                    type="number"
                    value={formMaxProjects}
                    onChange={(e) => setFormMaxProjects(e.target.value)}
                    min={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Active Projects</Label>
                  <Input
                    type="number"
                    value={formMaxActiveProjects}
                    onChange={(e) => setFormMaxActiveProjects(e.target.value)}
                    min={-1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Configuration Section */}
          {activeSection === 'ai' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={formAiModel} onValueChange={setFormAiModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={formAiMaxTokens}
                    onChange={(e) => setFormAiMaxTokens(e.target.value)}
                    placeholder="e.g. 4096"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Uses Per User</Label>
                  <Input
                    type="number"
                    value={formAiMonthlyUses}
                    onChange={(e) => setFormAiMonthlyUses(e.target.value)}
                    placeholder="-1 for unlimited"
                    min={-1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setFormAiStreaming(!formAiStreaming)}
                  className={`flex items-center justify-between flex-1 ${
                    formAiStreaming ? '' : 'opacity-60'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Streaming Responses
                    </p>
                    <p className="text-xs text-slate-400">
                      Enable real-time streaming for AI responses
                    </p>
                  </div>
                  <Badge
                    variant={formAiStreaming ? 'default' : 'outline'}
                    className={formAiStreaming ? 'bg-green-100 text-green-700 border-0' : ''}
                  >
                    {formAiStreaming ? 'On' : 'Off'}
                  </Badge>
                </button>
              </div>
            </div>
          )}

          {/* Student Coaching Section */}
          {activeSection === 'coaching' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-500">
                Configure per-user student coaching limits for this tier.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coaching Interactions / Month</Label>
                  <Input
                    type="number"
                    value={formCoachingInteractions}
                    onChange={(e) => setFormCoachingInteractions(e.target.value)}
                    placeholder="e.g. 20"
                    min={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resume Reviews / Month</Label>
                  <Input
                    type="number"
                    value={formResumeReviews}
                    onChange={(e) => setFormResumeReviews(e.target.value)}
                    placeholder="e.g. 5"
                    min={-1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cover Letters / Month</Label>
                  <Input
                    type="number"
                    value={formCoverLetters}
                    onChange={(e) => setFormCoverLetters(e.target.value)}
                    placeholder="e.g. 3"
                    min={-1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Session Length (min)</Label>
                  <Input
                    type="number"
                    value={formSessionLength}
                    onChange={(e) => setFormSessionLength(e.target.value)}
                    placeholder="e.g. 30"
                    min={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Enterprise Features Section */}
          {activeSection === 'enterprise' && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-500">
                Toggle enterprise-grade features for this tier.
              </p>
              {[
                {
                  key: 'portfolioIntelligence',
                  label: 'Portfolio Intelligence',
                  desc: 'Cross-student skills analysis and program effectiveness insights',
                  value: formPortfolioIntelligence,
                  toggle: () => setFormPortfolioIntelligence(!formPortfolioIntelligence),
                },
                {
                  key: 'talentInsights',
                  label: 'Talent Insights',
                  desc: 'Industry trend matching and talent demand analysis',
                  value: formTalentInsights,
                  toggle: () => setFormTalentInsights(!formTalentInsights),
                },
                {
                  key: 'institutionalAnalytics',
                  label: 'Institutional Analytics',
                  desc: 'Advanced analytics across all tenant data',
                  value: formInstitutionalAnalytics,
                  toggle: () => setFormInstitutionalAnalytics(!formInstitutionalAnalytics),
                },
              ].map((feat) => (
                <button
                  key={feat.key}
                  type="button"
                  onClick={feat.toggle}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    feat.value
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {feat.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{feat.desc}</p>
                  </div>
                  <Badge
                    variant={feat.value ? 'default' : 'outline'}
                    className={feat.value ? 'bg-green-100 text-green-700 border-0' : ''}
                  >
                    {feat.value ? 'On' : 'Off'}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Network Access Section */}
          {activeSection === 'network' && (
            <div className="space-y-4 py-2">
              <button
                type="button"
                onClick={() => setFormNetworkEnabled(!formNetworkEnabled)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  formNetworkEnabled
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Shared Network Access
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Allow tenants on this tier to access the shared corporate network
                  </p>
                </div>
                <Badge
                  variant={formNetworkEnabled ? 'default' : 'outline'}
                  className={formNetworkEnabled ? 'bg-green-100 text-green-700 border-0' : ''}
                >
                  {formNetworkEnabled ? 'On' : 'Off'}
                </Badge>
              </button>
              {formNetworkEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Network Partners</Label>
                    <Input
                      type="number"
                      value={formNetworkMaxPartners}
                      onChange={(e) => setFormNetworkMaxPartners(e.target.value)}
                      placeholder="-1 for unlimited"
                      min={-1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Applications / Month</Label>
                    <Input
                      type="number"
                      value={formNetworkMaxApplications}
                      onChange={(e) => setFormNetworkMaxApplications(e.target.value)}
                      placeholder="-1 for unlimited"
                      min={-1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Features Section */}
          {activeSection === 'features' && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-500">
                Toggle which platform features are included in this tier.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(formFeatures).map(([key, enabled]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setFormFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      enabled
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <Badge
                      variant={enabled ? 'default' : 'outline'}
                      className={enabled ? 'bg-green-100 text-green-700 border-0' : ''}
                    >
                      {enabled ? 'On' : 'Off'}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branding Section */}
          {activeSection === 'branding' && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-500">
                Configure which branding capabilities are available for this tier.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(formBranding).map(([key, enabled]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setFormBranding((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      enabled
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <Badge
                      variant={enabled ? 'default' : 'outline'}
                      className={enabled ? 'bg-green-100 text-green-700 border-0' : ''}
                    >
                      {enabled ? 'On' : 'Off'}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex items-center gap-3 w-full justify-between">
              <div>
                {saved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Saved - affects{' '}
                    {editingTier?.tenantCount || 0} tenant
                    {editingTier?.tenantCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditingTier(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />{' '}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
