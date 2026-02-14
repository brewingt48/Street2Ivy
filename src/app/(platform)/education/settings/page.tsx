'use client';

/**
 * Education Admin Settings — Branding, Video, Content Customization
 *
 * Allows edu admins to customize their institution's branding,
 * hero video, welcome message, and content on the platform.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  Crown,
  ExternalLink,
  Lock,
  Palette,
  Play,
  Save,
  Settings,
  Type,
  Video,
  ArrowUp,
  Plus,
  Trash2,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  HelpCircle,
  GripVertical,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface TenantSettings {
  id: string;
  subdomain: string;
  name: string;
  displayName: string | null;
  status: string;
  institutionDomain: string | null;
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    heroVideoUrl?: string;
    faviconUrl?: string;
    welcomeMessage?: string;
    tagline?: string;
  };
  features: {
    plan?: string;
    customBranding?: boolean;
    aiCoaching?: boolean;
    maxStudents?: number;
    maxListings?: number;
    [key: string]: unknown;
  };
}

export default function EducationSettingsPage() {
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0F766E');
  const [secondaryColor, setSecondaryColor] = useState('#C8A951');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [tagline, setTagline] = useState('');

  // FAQ state
  const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string; order: number }>>([]);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqMsg, setFaqMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tenant content customization state
  const [tenantHeroTagline, setTenantHeroTagline] = useState('');
  const [tenantHeroHeadline, setTenantHeroHeadline] = useState('');
  const [tenantHeroSubheadline, setTenantHeroSubheadline] = useState('');
  const [tenantCtaHeadline, setTenantCtaHeadline] = useState('');
  const [tenantCtaSubheadline, setTenantCtaSubheadline] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMsg, setContentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/education/settings');
      const data = await res.json();
      if (res.ok && data.tenant) {
        setTenant(data.tenant);
        setDisplayName(data.tenant.displayName || '');
        setPrimaryColor(data.tenant.branding?.primaryColor || '#0F766E');
        setSecondaryColor(data.tenant.branding?.secondaryColor || '#C8A951');
        setLogoUrl(data.tenant.branding?.logoUrl || '');
        setHeroVideoUrl(data.tenant.branding?.heroVideoUrl || '');
        setWelcomeMessage(data.tenant.branding?.welcomeMessage || '');
        setTagline(data.tenant.branding?.tagline || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    // Load FAQ items
    fetch('/api/education/faq')
      .then((r) => r.json())
      .then((data) => {
        setFaqItems(
          (data.items || []).map((item: Record<string, unknown>, i: number) => ({
            question: (item.question as string) || '',
            answer: (item.answer as string) || '',
            order: (item.order as number) ?? i,
          }))
        );
      })
      .catch(console.error);
    // Load tenant content
    fetch('/api/education/content')
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          const c = data.content as Record<string, unknown>;
          const hero = (c.heroCopy || {}) as Record<string, string>;
          const cta = (c.ctaCopy || {}) as Record<string, string>;
          setTenantHeroTagline(hero.tagline || '');
          setTenantHeroHeadline(hero.headline || '');
          setTenantHeroSubheadline(hero.subheadline || '');
          setTenantCtaHeadline(cta.headline || '');
          setTenantCtaSubheadline(cta.subheadline || '');
        }
      })
      .catch(console.error);
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/api/education/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          branding: {
            primaryColor,
            secondaryColor,
            logoUrl: logoUrl || undefined,
            heroVideoUrl: heroVideoUrl || undefined,
            welcomeMessage: welcomeMessage || undefined,
            tagline: tagline || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchSettings();
    } catch (err) {
      setError('Network error — please try again');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const canCustomize = tenant?.features?.customBranding === true;
  const planName = String(tenant?.features?.plan || 'starter');

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No tenant settings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Institution Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize your institution&apos;s branding and content on Campus2Career
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{planName} Plan</Badge>
          <a
            href={`https://${tenant.subdomain}.campus2career.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
          >
            View Site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Upgrade notice for non-customizable plans */}
      {!canCustomize && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 flex gap-3">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium">Custom Branding Not Available</p>
            <p className="mt-1">
              Your <strong className="capitalize">{planName}</strong> plan includes basic branding. Upgrade to
              Professional or Enterprise to unlock custom colors, logos, video headers, and more.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-teal-600" /> Identity
              </CardTitle>
              <CardDescription>Basic institution identity and messaging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={tenant.name}
                />
                <p className="text-xs text-slate-400">Short name shown in the UI (e.g. &quot;Harvard&quot; instead of &quot;Harvard University&quot;)</p>
              </div>

              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="From Campus to Career"
                  disabled={!canCustomize}
                />
              </div>

              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Welcome to our Campus2Career portal! Explore paid project opportunities with top companies..."
                  rows={3}
                  disabled={!canCustomize}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
                <p className="text-xs text-slate-500">Institution Name: <strong className="text-slate-700 dark:text-slate-300">{tenant.name}</strong></p>
                <p className="text-xs text-slate-500">Subdomain: <strong className="text-slate-700 dark:text-slate-300 font-mono">{tenant.subdomain}.campus2career.com</strong></p>
                {tenant.institutionDomain && (
                  <p className="text-xs text-slate-500">Domain: <strong className="text-slate-700 dark:text-slate-300">{tenant.institutionDomain}</strong></p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className={!canCustomize ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-teal-600" /> Brand Colors
                {!canCustomize && <Lock className="h-4 w-4 text-slate-400" />}
              </CardTitle>
              <CardDescription>Customize your institution&apos;s color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!canCustomize}
                    className="w-12 h-12 rounded cursor-pointer border-0 disabled:opacity-50"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary</p>
                    <p className="text-xs font-mono text-slate-400">{primaryColor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    disabled={!canCustomize}
                    className="w-12 h-12 rounded cursor-pointer border-0 disabled:opacity-50"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Secondary</p>
                    <p className="text-xs font-mono text-slate-400">{secondaryColor}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://your-school.edu/logo.png"
                  disabled={!canCustomize}
                />
                <p className="text-xs text-slate-400">Recommended: 200x60 PNG with transparent background</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Video + Preview */}
        <div className="space-y-6">
          {/* Video */}
          <Card className={!canCustomize ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-teal-600" /> Hero Video
                {!canCustomize && <Lock className="h-4 w-4 text-slate-400" />}
              </CardTitle>
              <CardDescription>
                Set a video to play in the hero section of your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={heroVideoUrl}
                  onChange={(e) => setHeroVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or .mp4 URL"
                  disabled={!canCustomize}
                />
                <p className="text-xs text-slate-400">
                  Supports YouTube, Vimeo, or direct MP4 URLs. This plays as a background
                  video on your institution&apos;s landing page.
                </p>
              </div>

              {/* Video Preview */}
              {heroVideoUrl && canCustomize && (
                <div className="rounded-lg overflow-hidden border bg-slate-900 aspect-video flex items-center justify-center">
                  {heroVideoUrl.includes('youtube.com') || heroVideoUrl.includes('youtu.be') ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(heroVideoUrl)}?autoplay=0`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : heroVideoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${extractVimeoId(heroVideoUrl)}`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={heroVideoUrl}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  )}
                </div>
              )}

              {!heroVideoUrl && canCustomize && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 aspect-video flex flex-col items-center justify-center text-slate-400">
                  <Play className="h-10 w-10 mb-2" />
                  <p className="text-sm">Add a video URL above to preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your branding will appear on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simulated nav bar */}
              <div className="rounded-lg overflow-hidden border">
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {displayName || tenant.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/70 text-xs">Dashboard</span>
                    <span className="text-white/70 text-xs">Projects</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: secondaryColor, color: primaryColor }}
                    >
                      A
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {tagline || `Welcome to ${displayName || tenant.name}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {welcomeMessage || 'Explore paid project opportunities with top companies...'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <div
                      className="px-3 py-1.5 rounded-md text-xs text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Browse Projects
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-md text-xs font-medium border"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      My Profile
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features & Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white capitalize">
                    {String(tenant.features.plan || 'starter')} Plan
                  </p>
                  <p className="text-xs text-slate-500">
                    {tenant.features.maxStudents === -1 ? 'Unlimited' : tenant.features.maxStudents || 100} students &middot;{' '}
                    {tenant.features.maxListings === -1 ? 'Unlimited' : tenant.features.maxListings || 10} listings
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {String(tenant.features.plan || 'starter')}
                </Badge>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Custom Branding', value: tenant.features.customBranding ? 'Enabled' : 'Not available' },
                  { label: 'AI Coaching', value: tenant.features.aiCoaching ? 'Enabled' : 'Not available' },
                  { label: 'Analytics', value: (tenant.features as Record<string, unknown>).analytics ? 'Enabled' : 'Not available' },
                  { label: 'API Access', value: (tenant.features as Record<string, unknown>).apiAccess ? 'Enabled' : 'Not available' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{f.label}</span>
                    <span className={`text-sm font-medium ${f.value === 'Enabled' ? 'text-green-600' : 'text-slate-400'}`}>{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Upgrade Request */}
              {String(tenant.features.plan || 'starter') !== 'enterprise' && (
                <UpgradeRequestCard currentPlan={String(tenant.features.plan || 'starter')} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Landing Page Content Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-teal-600" />
                Landing Page Content
              </CardTitle>
              <CardDescription className="mt-1">
                Customize the text that appears on your institution&apos;s landing page. Leave fields blank to use platform defaults.
              </CardDescription>
            </div>
            <Button
              onClick={async () => {
                setContentSaving(true);
                setContentMsg(null);
                try {
                  const res = await fetch('/api/education/content', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      heroCopy: {
                        tagline: tenantHeroTagline || undefined,
                        headline: tenantHeroHeadline || undefined,
                        subheadline: tenantHeroSubheadline || undefined,
                      },
                      ctaCopy: {
                        headline: tenantCtaHeadline || undefined,
                        subheadline: tenantCtaSubheadline || undefined,
                      },
                    }),
                  });
                  if (!res.ok) {
                    const d = await res.json();
                    throw new Error(d.error || 'Failed to save');
                  }
                  setContentMsg({ type: 'success', text: 'Content saved successfully' });
                  setTimeout(() => setContentMsg(null), 3000);
                } catch (err) {
                  setContentMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
                } finally {
                  setContentSaving(false);
                }
              }}
              disabled={contentSaving}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {contentSaving ? 'Saving...' : 'Save Content'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentMsg && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              contentMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {contentMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {contentMsg.text}
            </div>
          )}

          <div className="space-y-3 p-3 border rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase">Hero Section</p>
            <div>
              <Label>Tagline</Label>
              <Input
                value={tenantHeroTagline}
                onChange={(e) => setTenantHeroTagline(e.target.value)}
                placeholder="From Campus to Career"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Headline</Label>
              <Input
                value={tenantHeroHeadline}
                onChange={(e) => setTenantHeroHeadline(e.target.value)}
                placeholder="Where Talent Meets Opportunity"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea
                value={tenantHeroSubheadline}
                onChange={(e) => setTenantHeroSubheadline(e.target.value)}
                placeholder="Campus2Career connects students with real corporate projects..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 border rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase">Call-to-Action Section</p>
            <div>
              <Label>CTA Headline</Label>
              <Input
                value={tenantCtaHeadline}
                onChange={(e) => setTenantCtaHeadline(e.target.value)}
                placeholder="Ready to Bridge the Gap Between Campus and Career?"
                className="mt-1"
              />
            </div>
            <div>
              <Label>CTA Subheadline</Label>
              <Input
                value={tenantCtaSubheadline}
                onChange={(e) => setTenantCtaSubheadline(e.target.value)}
                placeholder="Book a demo to see how Campus2Career can transform your talent pipeline."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Management */}
      <TenantFaqSection
        items={faqItems}
        setItems={setFaqItems}
        saving={faqSaving}
        msg={faqMsg}
        onSave={async () => {
          setFaqSaving(true);
          setFaqMsg(null);
          try {
            const orderedItems = faqItems.map((item, i) => ({ ...item, order: i }));
            const res = await fetch('/api/education/faq', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: orderedItems }),
            });
            if (!res.ok) {
              const d = await res.json();
              throw new Error(d.error || 'Failed to save');
            }
            setFaqMsg({ type: 'success', text: 'FAQ saved successfully' });
          } catch (err) {
            setFaqMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
          } finally {
            setFaqSaving(false);
          }
        }}
      />

      {/* Save Button */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1 bg-green-50 px-3 py-2 rounded-lg">
            <Check className="h-4 w-4" /> Settings saved successfully
          </span>
        )}
        <Button
          className="bg-teal-600 hover:bg-teal-700 shadow-lg"
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

/* ── Upgrade Request Card ── */
function UpgradeRequestCard({ currentPlan }: { currentPlan: string }) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ pending: boolean; plan: string | null }>({ pending: false, plan: null });

  useEffect(() => {
    fetch('/api/education/upgrade-request')
      .then((r) => r.json())
      .then((data) => {
        if (data.upgradeRequestPending) {
          setStatus({ pending: true, plan: data.requestedPlan });
        }
      })
      .catch(() => {});
  }, []);

  const handleRequest = async () => {
    if (!selectedPlan) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/education/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedPlan: selectedPlan, message }),
      });
      if (res.ok) {
        setRequested(true);
        setStatus({ pending: true, plan: selectedPlan });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRequesting(false);
    }
  };

  if (status.pending) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mt-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            Upgrade to <span className="capitalize">{status.plan}</span> requested
          </p>
        </div>
        <p className="text-xs text-amber-600 mt-1">
          Your upgrade request has been submitted. A platform admin will review it shortly.
        </p>
      </div>
    );
  }

  const upgradePlans = currentPlan === 'starter'
    ? [
        { value: 'professional', label: 'Professional', desc: '500 students, 50 listings, AI coaching, custom branding' },
        { value: 'enterprise', label: 'Enterprise', desc: 'Unlimited students & listings, API access, full features' },
      ]
    : [
        { value: 'enterprise', label: 'Enterprise', desc: 'Unlimited students & listings, API access, full features' },
      ];

  return (
    <div className="p-4 rounded-lg border border-dashed border-teal-300 bg-teal-50/50 mt-4">
      <p className="text-sm font-medium text-teal-800 flex items-center gap-2">
        <ArrowUp className="h-4 w-4" /> Request a Plan Upgrade
      </p>
      <p className="text-xs text-teal-600 mt-1 mb-3">
        Need more capacity or features? Request an upgrade and we&apos;ll review it.
      </p>

      <div className="space-y-3">
        <div className="flex gap-2">
          {upgradePlans.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedPlan(p.value)}
              className={`flex-1 text-left p-3 rounded-lg border text-sm transition-colors ${
                selectedPlan === p.value
                  ? 'border-teal-500 bg-teal-100'
                  : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <p className="font-medium text-slate-900">{p.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>

        {selectedPlan && (
          <>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional: Tell us why you need an upgrade..."
              rows={2}
              className="text-sm"
            />
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleRequest}
              disabled={requesting}
            >
              <ArrowUp className="h-3.5 w-3.5 mr-1" />
              {requesting ? 'Submitting...' : requested ? 'Submitted!' : 'Request Upgrade'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Tenant FAQ Section ── */
interface TenantFaqSectionProps {
  items: Array<{ question: string; answer: string; order: number }>;
  setItems: React.Dispatch<React.SetStateAction<Array<{ question: string; answer: string; order: number }>>>;
  saving: boolean;
  msg: { type: 'success' | 'error'; text: string } | null;
  onSave: () => void;
}

function TenantFaqSection({ items, setItems, saving, msg, onSave }: TenantFaqSectionProps) {
  const addItem = () => {
    setItems([...items, { question: '', answer: '', order: items.length }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-teal-600" />
              FAQ Management
            </CardTitle>
            <CardDescription className="mt-1">
              Create frequently asked questions for your institution&apos;s portal. These can be displayed to your students and partners.
            </CardDescription>
          </div>
          <Button onClick={onSave} disabled={saving} size="sm" className="bg-teal-600 hover:bg-teal-700">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save FAQ'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg && (
          <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No FAQ items yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5" />
                    Q{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveItem(index, 'up')} disabled={index === 0} className="h-7 w-7 p-0">
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="h-7 w-7 p-0">
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Question..."
                  value={item.question}
                  onChange={(e) => updateItem(index, 'question', e.target.value)}
                />
                <Textarea
                  placeholder="Answer..."
                  value={item.answer}
                  onChange={(e) => updateItem(index, 'answer', e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Helpers to extract video IDs
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || '';
}
