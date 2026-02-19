'use client';

/**
 * Admin AI Management Dashboard
 *
 * Three-tab interface for monitoring AI usage, configuring tier overrides,
 * and viewing recent conversation activity across all tenants.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Sparkles,
  Building2,
  Settings,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantUsage {
  tenantId: string;
  tenantName: string;
  plan: string;
  used: number;
  limit: number; // -1 = unlimited
  model: string;
}

interface MonthlyTrend {
  month: string;
  total: number;
}

interface UsageData {
  totalUsage: number;
  tenantUsage: TenantUsage[];
  monthlyTrend: MonthlyTrend[];
  approachingLimit: TenantUsage[];
}

interface TierConfig {
  model: string;
  maxMonthlyUses: number;
  features: string[];
}

interface TenantOverride {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  plan: string;
  hasOverride: boolean;
  override: { model?: string; maxMonthlyUses?: number; features?: string[] } | null;
}

interface ConfigData {
  tierConfigs: Record<string, TierConfig>;
  tenantOverrides: TenantOverride[];
}

interface TenantActivity {
  tenantId: string;
  tenantName: string;
  conversations: number;
  lastActive: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVAILABLE_FEATURES = [
  'coaching',
  'match_insights',
  'diff_view',
  'project_scoping',
  'portfolio_intelligence',
  'talent_insights',
];

const MODEL_OPTIONS = [
  { value: 'claude-haiku-4-5-20250901', label: 'Claude Haiku 4.5' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
];

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusInfo(used: number, limit: number) {
  if (limit === -1) return { label: 'Unlimited', color: 'bg-green-100 text-green-700' };
  const pct = limit > 0 ? used / limit : 0;
  if (pct >= 1) return { label: 'At Limit', color: 'bg-red-100 text-red-700' };
  if (pct >= 0.8) return { label: 'Approaching', color: 'bg-yellow-100 text-yellow-700' };
  return { label: 'OK', color: 'bg-green-100 text-green-700' };
}

function formatLimit(limit: number): string {
  return limit === -1 ? 'Unlimited' : String(limit);
}

function formatRemaining(used: number, limit: number): string {
  if (limit === -1) return 'Unlimited';
  return String(Math.max(0, limit - used));
}

function shortModel(model: string): string {
  if (model.includes('haiku')) return 'Haiku 4.5';
  if (model.includes('sonnet')) return 'Sonnet 4';
  return model;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAiPage() {
  const [activeTab, setActiveTab] = useState<'usage' | 'configuration' | 'activity'>('usage');
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [activityData, setActivityData] = useState<TenantActivity[]>([]);
  const [error, setError] = useState('');

  // Override form state
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [overrideModel, setOverrideModel] = useState('');
  const [overrideLimit, setOverrideLimit] = useState('');
  const [overrideFeatures, setOverrideFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usageRes, configRes, activityRes] = await Promise.all([
        fetch('/api/admin/ai/usage'),
        fetch('/api/admin/ai/config'),
        fetch('/api/admin/ai/activity'),
      ]);

      if (!usageRes.ok || !configRes.ok || !activityRes.ok) {
        throw new Error('Failed to fetch AI management data');
      }

      const [usage, config, activity] = await Promise.all([
        usageRes.json(),
        configRes.json(),
        activityRes.json(),
      ]);

      setUsageData(usage);
      setConfigData(config);
      setActivityData(activity.activity || []);
    } catch (err) {
      console.error('Failed to load AI management data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Override handlers
  // ---------------------------------------------------------------------------

  const openOverrideForm = (tenant: TenantOverride) => {
    setEditingTenant(tenant.tenantId);
    const existing = tenant.override;
    const tierConfig = configData?.tierConfigs[tenant.plan];
    setOverrideModel(existing?.model || tierConfig?.model || '');
    setOverrideLimit(
      existing?.maxMonthlyUses != null
        ? String(existing.maxMonthlyUses)
        : tierConfig?.maxMonthlyUses != null
          ? String(tierConfig.maxMonthlyUses)
          : ''
    );
    setOverrideFeatures(existing?.features || tierConfig?.features || []);
    setSaveSuccess('');
  };

  const closeOverrideForm = () => {
    setEditingTenant(null);
    setOverrideModel('');
    setOverrideLimit('');
    setOverrideFeatures([]);
    setSaveSuccess('');
  };

  const toggleFeature = (feature: string) => {
    setOverrideFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const handleSaveOverride = async () => {
    if (!editingTenant) return;
    setSaving(true);
    setSaveSuccess('');
    setError('');

    try {
      const aiConfig: Record<string, unknown> = {};
      if (overrideModel) aiConfig.model = overrideModel;
      if (overrideLimit !== '') aiConfig.maxMonthlyUses = Number(overrideLimit);
      if (overrideFeatures.length > 0) aiConfig.features = overrideFeatures;

      const res = await csrfFetch('/api/admin/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: editingTenant, aiConfig }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save override');
      }

      setSaveSuccess(editingTenant);
      setTimeout(() => setSaveSuccess(''), 3000);

      // Refresh config data
      const configRes = await fetch('/api/admin/ai/config');
      if (configRes.ok) {
        const config = await configRes.json();
        setConfigData(config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const activeTenantCount = usageData?.tenantUsage.filter((t) => t.used > 0).length ?? 0;
  const avgUsage =
    activeTenantCount > 0 ? Math.round((usageData?.totalUsage ?? 0) / activeTenantCount) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-teal-600" />
          AI Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor usage, configure tiers, and manage AI access across tenants
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {([
          { key: 'usage' as const, label: 'Usage', icon: BarChart3 },
          { key: 'configuration' as const, label: 'Configuration', icon: Settings },
          { key: 'activity' as const, label: 'Activity', icon: Activity },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* Usage Tab                                                          */}
      {/* ================================================================== */}
      {activeTab === 'usage' && usageData && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {usageData.totalUsage.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Total Uses This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {activeTenantCount}
                    </p>
                    <p className="text-xs text-slate-500">Active Tenants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {usageData.approachingLimit.length}
                    </p>
                    <p className="text-xs text-slate-500">Approaching Limit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {avgUsage}
                    </p>
                    <p className="text-xs text-slate-500">Avg Uses / Active Tenant</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          {usageData.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Monthly Usage Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {usageData.monthlyTrend.map((m) => {
                    const maxTotal = Math.max(...usageData.monthlyTrend.map((t) => t.total), 1);
                    const heightPct = Math.max((m.total / maxTotal) * 100, 4);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-slate-600">{m.total}</span>
                        <div
                          className="w-full bg-teal-500 rounded-t"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] text-slate-400">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-tenant usage table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-teal-600" />
                Per-Tenant Usage
              </CardTitle>
              <CardDescription>
                Current month usage breakdown by tenant, sorted by usage descending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-2 font-medium text-slate-500">Tenant Name</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-500">Plan</th>
                      <th className="text-left py-3 px-2 font-medium text-slate-500">Model</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-500">Used</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-500">Limit</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-500">Remaining</th>
                      <th className="text-center py-3 px-2 font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.tenantUsage.map((tenant) => {
                      const status = getStatusInfo(tenant.used, tenant.limit);
                      return (
                        <tr
                          key={tenant.tenantId}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">
                            {tenant.tenantName}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className={PLAN_COLORS[tenant.plan] || ''}>
                              {PLAN_LABELS[tenant.plan] || tenant.plan}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                            {shortModel(tenant.model)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-900 dark:text-white">
                            {tenant.used}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatLimit(tenant.limit)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatRemaining(tenant.used, tenant.limit)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {usageData.tenantUsage.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No usage data for the current month
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* Configuration Tab                                                  */}
      {/* ================================================================== */}
      {activeTab === 'configuration' && configData && (
        <div className="space-y-6">
          {/* Default tier configs */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Default Tier Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(configData.tierConfigs).map(([tier, config]) => (
                <Card key={tier}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{PLAN_LABELS[tier] || tier}</span>
                      <Badge variant="outline" className={PLAN_COLORS[tier] || ''}>
                        {tier}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{shortModel(config.model)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly Limit</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {config.maxMonthlyUses === -1 ? 'Unlimited' : config.maxMonthlyUses}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {config.features.map((f) => (
                          <Badge key={f} variant="outline" className="text-[10px]">
                            {f.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Per-tenant overrides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-teal-600" />
                Per-Tenant Overrides
              </CardTitle>
              <CardDescription>
                Override the default tier configuration for individual tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {configData.tenantOverrides.map((tenant) => (
                  <div key={tenant.tenantId}>
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        tenant.hasOverride
                          ? 'border-teal-200 bg-teal-50/50 dark:bg-teal-900/10'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {tenant.tenantName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {tenant.subdomain}.proveground.com
                            <span className="mx-1.5">&middot;</span>
                            <span className={PLAN_COLORS[tenant.plan]?.replace('bg-', 'text-').split(' ')[1] || 'text-slate-500'}>
                              {PLAN_LABELS[tenant.plan] || tenant.plan}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tenant.hasOverride && (
                          <Badge variant="outline" className="bg-teal-100 text-teal-700 border-0 text-[10px]">
                            Overridden
                          </Badge>
                        )}
                        {saveSuccess === tenant.tenantId && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            editingTenant === tenant.tenantId
                              ? closeOverrideForm()
                              : openOverrideForm(tenant)
                          }
                        >
                          {editingTenant === tenant.tenantId ? 'Close' : 'Override'}
                        </Button>
                      </div>
                    </div>

                    {/* Override form (collapsible) */}
                    {editingTenant === tenant.tenantId && (
                      <div className="mt-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-4">
                        {/* Model selector */}
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                            Model
                          </label>
                          <Select value={overrideModel} onValueChange={setOverrideModel}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a model" />
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

                        {/* Usage limit */}
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                            Monthly Usage Limit (-1 for unlimited)
                          </label>
                          <Input
                            type="number"
                            value={overrideLimit}
                            onChange={(e) => setOverrideLimit(e.target.value)}
                            placeholder="e.g. 50 or -1 for unlimited"
                            min={-1}
                          />
                        </div>

                        {/* Feature checkboxes */}
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                            Features
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {AVAILABLE_FEATURES.map((feature) => (
                              <label
                                key={feature}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={overrideFeatures.includes(feature)}
                                  onChange={() => toggleFeature(feature)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {feature.replace(/_/g, ' ')}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Save button */}
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSaveOverride}
                            disabled={saving}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            {saving ? 'Saving...' : 'Save Override'}
                          </Button>
                          <Button variant="outline" onClick={closeOverrideForm}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {configData.tenantOverrides.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No active tenants</p>
                    <p className="text-sm mt-1">Create tenants in the Tenants section first</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* Activity Tab                                                       */}
      {/* ================================================================== */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-teal-600" />
                Recent AI Conversations (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Conversation counts grouped by tenant for the past 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-2 font-medium text-slate-500">Tenant</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-500">Conversations</th>
                      <th className="text-right py-3 px-2 font-medium text-slate-500">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.map((tenant) => (
                      <tr
                        key={tenant.tenantId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">
                          {tenant.tenantName}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-900 dark:text-white">
                          {tenant.conversations}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
                          {tenant.lastActive
                            ? new Date(tenant.lastActive).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'No activity'}
                        </td>
                      </tr>
                    ))}
                    {activityData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400">
                          No conversation activity in the last 30 days
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
