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
import {
  Check,
  ExternalLink,
  Lock,
  Palette,
  Play,
  Save,
  Settings,
  Type,
  Video,
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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

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

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Your Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Max Students', value: tenant.features.maxStudents === -1 ? 'Unlimited' : String(tenant.features.maxStudents || 100) },
                  { label: 'Max Listings', value: tenant.features.maxListings === -1 ? 'Unlimited' : String(tenant.features.maxListings || 10) },
                  { label: 'Custom Branding', value: tenant.features.customBranding ? 'Enabled' : 'Not available' },
                  { label: 'AI Coaching', value: tenant.features.aiCoaching ? 'Enabled' : 'Not available' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{f.label}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{f.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

// Helpers to extract video IDs
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || '';
}
