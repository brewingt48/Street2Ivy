'use client';

/**
 * Admin AI Coaching Configuration
 *
 * System-wide coaching URL and toggle,
 * plus per-tenant coaching enable/disable.
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Globe,
  Building2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  features: Record<string, unknown>;
}

interface PlatformSettings {
  aiCoachingUrl: string;
  aiCoachingEnabled: boolean;
}

export default function AdminCoachingPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    aiCoachingUrl: '',
    aiCoachingEnabled: false,
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTenant, setSavingTenant] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedTenant, setSavedTenant] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/tenants').then((r) => r.json()),
    ])
      .then(([settingsData, tenantsData]) => {
        if (settingsData.settings) {
          setSettings({
            aiCoachingUrl: settingsData.settings.aiCoachingUrl || '',
            aiCoachingEnabled: settingsData.settings.aiCoachingEnabled || false,
          });
        }
        setTenants(tenantsData.tenants || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveGlobal = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiCoachingUrl: settings.aiCoachingUrl,
          aiCoachingEnabled: settings.aiCoachingEnabled,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleTenantCoaching = async (tenant: Tenant) => {
    setSavingTenant(tenant.id);
    setSavedTenant('');
    try {
      const currentFeatures = (tenant.features || {}) as Record<string, unknown>;
      const newEnabled = !currentFeatures.aiCoachingEnabled;
      const newFeatures = { ...currentFeatures, aiCoachingEnabled: newEnabled };

      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: newFeatures }),
      });

      if (res.ok) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenant.id
              ? { ...t, features: newFeatures }
              : t
          )
        );
        setSavedTenant(tenant.id);
        setTimeout(() => setSavedTenant(''), 2000);
      }
    } catch (err) {
      console.error('Failed to toggle tenant coaching:', err);
    } finally {
      setSavingTenant(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const activeTenants = tenants.filter((t) => t.status === 'active');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          AI Coaching Configuration
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage the AI coaching URL and control access system-wide and per-tenant
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* System-Wide Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            System-Wide Coaching Settings
          </CardTitle>
          <CardDescription>
            Configure the AI coaching platform URL and global access toggle.
            This applies to all tenants unless overridden at the tenant level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium text-sm">AI Coaching — System Wide</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings.aiCoachingEnabled
                  ? 'Coaching is enabled globally. Tenants can be individually disabled below.'
                  : 'Coaching is disabled globally. No tenants will have access.'}
              </p>
            </div>
            <Button
              variant={settings.aiCoachingEnabled ? 'default' : 'outline'}
              size="sm"
              className={settings.aiCoachingEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  aiCoachingEnabled: !prev.aiCoachingEnabled,
                }))
              }
            >
              {settings.aiCoachingEnabled ? (
                <>
                  <ToggleRight className="h-4 w-4 mr-1" /> Enabled
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4 mr-1" /> Disabled
                </>
              )}
            </Button>
          </div>

          {/* Integrated AI Info */}
          <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/50 dark:bg-teal-900/10">
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Integrated AI Coaching</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
              AI coaching is now built into the platform. Students access it directly from their sidebar navigation.
              The coaching quality and usage limits are determined by each tenant&apos;s plan tier (Starter / Professional / Enterprise).
            </p>
          </div>

          {/* Legacy URL (hidden if empty) */}
          {settings.aiCoachingUrl && (
            <div>
              <Label htmlFor="coachingUrl">Legacy Coaching URL (optional fallback)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="coachingUrl"
                  value={settings.aiCoachingUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, aiCoachingUrl: e.target.value }))
                  }
                  placeholder="https://coaching.campus2career.com"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Optional: legacy external coaching URL. Clear this field to fully switch to integrated coaching.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveGlobal}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Global Settings'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Tenant Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-600" />
            Per-Tenant Coaching Access
          </CardTitle>
          <CardDescription>
            {settings.aiCoachingEnabled
              ? 'AI coaching is enabled globally. Toggle individual tenants below.'
              : 'AI coaching is disabled globally. Enable it above to manage per-tenant access.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!settings.aiCoachingEnabled ? (
            <div className="text-center py-8 text-slate-400">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Global coaching is disabled</p>
              <p className="text-sm mt-1">Enable system-wide coaching above to manage per-tenant access</p>
            </div>
          ) : activeTenants.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No active tenants</p>
              <p className="text-sm mt-1">Create tenants in the Tenants section first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTenants.map((tenant) => {
                const features = (tenant.features || {}) as Record<string, unknown>;
                const isEnabled = !!features.aiCoachingEnabled;
                const isSaving = savingTenant === tenant.id;
                const justSaved = savedTenant === tenant.id;

                return (
                  <div
                    key={tenant.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isEnabled ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {tenant.subdomain}.campus2career.com
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {justSaved && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <Badge
                        variant={isEnabled ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          isEnabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border-0'
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => !isSaving && toggleTenantCoaching(tenant)}
                      >
                        {isSaving ? (
                          'Saving...'
                        ) : isEnabled ? (
                          <>
                            <ToggleRight className="h-3 w-3 mr-1" /> Enabled
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3 mr-1" /> Disabled
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How AI Coaching Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600 mb-1">1</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Coaching</p>
              <p className="text-xs text-slate-500 mt-1">
                Turn on the global toggle to make AI coaching available platform-wide
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600 mb-1">2</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Tier-Based Access</p>
              <p className="text-xs text-slate-500 mt-1">
                Starter gets basic coaching (10/mo), Professional gets full features (50/mo), Enterprise is unlimited
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600 mb-1">3</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Per-Tenant Control</p>
              <p className="text-xs text-slate-500 mt-1">
                Enable or disable coaching per tenant below. Use AI Management for usage monitoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
