'use client';

/**
 * Education Admin — Team Huddle Branding
 *
 * Customization page for the branded Team Huddle landing page.
 * Allows education admins to set banner image/video, brand colors,
 * welcome message, and layout configuration.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/ui/file-upload';
import { HeroPreview } from '@/components/huddle/hero-preview';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  Palette,
  Type,
  Layout,
  Eye,
  Video,
  ImageOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandingData {
  bannerType: 'image' | 'video' | 'none';
  bannerImageUrl: string | null;
  bannerVideoUrl: string | null;
  bannerOverlayOpacity: number;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeTitle: string | null;
  welcomeMessage: string | null;
  layoutConfig: {
    featuredSectionTitle?: string;
    topicSections?: Array<{ topicId: string; title?: string; order: number }>;
    showContentTypes?: string[];
    sectionOrder?: string[];
    maxFeaturedPosts?: number;
  };
}

interface TenantDefaults {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HuddleBrandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tenantDefaults, setTenantDefaults] = useState<TenantDefaults | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [useDefaultColors, setUseDefaultColors] = useState(true);
  const [useDefaultLogo, setUseDefaultLogo] = useState(true);

  // Form state
  const [bannerType, setBannerType] = useState<'image' | 'video' | 'none'>('image');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerVideoUrl, setBannerVideoUrl] = useState('');
  const [bannerOverlayOpacity, setBannerOverlayOpacity] = useState(0.4);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [secondaryColor, setSecondaryColor] = useState('#f8fafc');
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [featuredSectionTitle, setFeaturedSectionTitle] = useState('Featured Content');
  const [maxFeaturedPosts, setMaxFeaturedPosts] = useState(4);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(['featured', 'topics', 'recent']);

  // Fetch branding data + topics
  useEffect(() => {
    Promise.all([
      fetch('/api/education/huddle/branding').then((r) => r.json()),
      fetch('/api/education/huddle/topics').then((r) => r.json()),
    ])
      .then(([brandingRes, topicsRes]) => {
        const b = brandingRes.branding as BrandingData;
        const td = brandingRes.tenantDefaults as TenantDefaults;

        setTenantDefaults(td);
        setBannerType(b.bannerType || 'image');
        setBannerImageUrl(b.bannerImageUrl || '');
        setBannerVideoUrl(b.bannerVideoUrl || '');
        setBannerOverlayOpacity(b.bannerOverlayOpacity ?? 0.4);
        setWelcomeTitle(b.welcomeTitle || '');
        setWelcomeMessage(b.welcomeMessage || '');

        // Determine if custom colors/logo are set
        const hasCustomLogo = b.logoUrl && b.logoUrl !== td.logoUrl;
        const hasCustomPrimary = b.primaryColor && b.primaryColor !== td.primaryColor;
        setUseDefaultLogo(!hasCustomLogo);
        setUseDefaultColors(!hasCustomPrimary);
        setLogoUrl(b.logoUrl || td.logoUrl || '');
        setPrimaryColor(b.primaryColor || td.primaryColor || '#0f766e');
        setSecondaryColor(b.secondaryColor || td.secondaryColor || '#f8fafc');

        // Layout config
        const lc = b.layoutConfig || {};
        setFeaturedSectionTitle(lc.featuredSectionTitle || 'Featured Content');
        setMaxFeaturedPosts(lc.maxFeaturedPosts || 4);
        setSelectedTopicIds((lc.topicSections || []).map((ts) => ts.topicId));
        setSectionOrder(lc.sectionOrder || ['featured', 'topics', 'recent']);

        setTopics(topicsRes.topics || []);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load branding settings');
      })
      .finally(() => setLoading(false));
  }, []);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const body = {
        bannerType,
        bannerImageUrl: bannerImageUrl || null,
        bannerVideoUrl: bannerVideoUrl || null,
        bannerOverlayOpacity,
        logoUrl: useDefaultLogo ? null : (logoUrl || null),
        primaryColor: useDefaultColors ? null : primaryColor,
        secondaryColor: useDefaultColors ? null : secondaryColor,
        welcomeTitle: welcomeTitle || null,
        welcomeMessage: welcomeMessage || null,
        layoutConfig: {
          featuredSectionTitle,
          maxFeaturedPosts,
          topicSections: selectedTopicIds.map((id, i) => ({ topicId: id, order: i })),
          sectionOrder,
          showContentTypes: ['video', 'article', 'pdf', 'audio', 'text_post'],
        },
      };

      const res = await csrfFetch('/api/education/huddle/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Move section order
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setSectionOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      return newOrder;
    });
  };

  const moveSectionDown = (index: number) => {
    setSectionOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const sectionLabels: Record<string, string> = {
    featured: 'Featured Content',
    topics: 'Topic Sections',
    recent: 'Recent Posts',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Team Huddle
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Team Huddle Branding
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize the landing page your students see when they open Team Huddle
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Live Preview — sticky, collapsible preview of changes */}
      <HeroPreview
        bannerType={bannerType}
        bannerImageUrl={bannerImageUrl}
        bannerVideoUrl={bannerVideoUrl}
        bannerOverlayOpacity={bannerOverlayOpacity}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        welcomeTitle={welcomeTitle}
        welcomeMessage={welcomeMessage}
        tenantName={tenantDefaults?.name || 'Your Institution'}
        sectionOrder={sectionOrder}
      />

      {/* Hero Banner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-teal-600" />
            Hero Banner
          </CardTitle>
          <CardDescription>
            The banner displayed at the top of the Team Huddle landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Banner Type */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Banner Type</Label>
            <div className="flex gap-2">
              {[
                { value: 'image' as const, icon: ImageIcon, label: 'Image' },
                { value: 'video' as const, icon: Video, label: 'Video' },
                { value: 'none' as const, icon: ImageOff, label: 'None' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={bannerType === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBannerType(opt.value)}
                  className={bannerType === opt.value ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  <opt.icon className="h-4 w-4 mr-1" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          {bannerType === 'image' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Banner Image</Label>
              <FileUpload
                onUpload={(url) => setBannerImageUrl(url)}
                accept="image/png,image/jpeg,image/gif,image/webp"
                folder="proveground/huddle/branding"
                uploadUrl="/api/education/upload"
                description="Upload a wide banner image (recommended: 1920x600 or similar)"
              />
              {bannerImageUrl && (
                <div className="flex items-center gap-2">
                  <Input
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="Banner image URL"
                    className="text-xs font-mono"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setBannerImageUrl('')}>Clear</Button>
                </div>
              )}
              {!bannerImageUrl && (
                <Input
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="Or paste an image URL"
                  className="text-sm"
                />
              )}
            </div>
          )}

          {/* Video URL */}
          {bannerType === 'video' && (
            <div>
              <Label className="text-xs font-medium">Banner Video URL</Label>
              <Input
                value={bannerVideoUrl}
                onChange={(e) => setBannerVideoUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/... or direct MP4 URL"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">Use a direct video URL (MP4). The video will autoplay muted and loop.</p>
            </div>
          )}

          {/* Overlay Opacity */}
          {bannerType !== 'none' && (
            <div>
              <Label className="text-xs font-medium">Overlay Darkness</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={bannerOverlayOpacity}
                  onChange={(e) => setBannerOverlayOpacity(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <Badge variant="outline" className="text-xs font-mono min-w-[3.5rem] text-center">
                  {Math.round(bannerOverlayOpacity * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">Controls text readability over the banner image</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Branding Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-teal-600" />
            Brand Colors & Logo
          </CardTitle>
          <CardDescription>
            Override your institution&apos;s default branding for the Team Huddle page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Use default toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useDefaultColors"
              checked={useDefaultColors}
              onChange={(e) => {
                setUseDefaultColors(e.target.checked);
                if (e.target.checked && tenantDefaults) {
                  setPrimaryColor(tenantDefaults.primaryColor);
                  setSecondaryColor(tenantDefaults.secondaryColor);
                }
              }}
              className="accent-teal-600"
            />
            <Label htmlFor="useDefaultColors" className="text-sm cursor-pointer">
              Use institution default colors
              {tenantDefaults && (
                <span className="ml-2 text-xs text-slate-400">
                  ({tenantDefaults.primaryColor})
                </span>
              )}
            </Label>
          </div>

          {!useDefaultColors && (
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs">Primary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-8 border border-slate-300 rounded cursor-pointer"
                  />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 text-sm" />
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Secondary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-8 border border-slate-300 rounded cursor-pointer"
                  />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Logo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useDefaultLogo"
              checked={useDefaultLogo}
              onChange={(e) => {
                setUseDefaultLogo(e.target.checked);
                if (e.target.checked && tenantDefaults) {
                  setLogoUrl(tenantDefaults.logoUrl || '');
                }
              }}
              className="accent-teal-600"
            />
            <Label htmlFor="useDefaultLogo" className="text-sm cursor-pointer">
              Use institution default logo
            </Label>
          </div>

          {!useDefaultLogo && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Custom Logo</Label>
              <FileUpload
                onUpload={(url) => setLogoUrl(url)}
                accept="image/png,image/jpeg,image/webp,image/gif"
                folder="proveground/huddle/branding"
                uploadUrl="/api/education/upload"
                description="Upload your Team Huddle logo (PNG, JPEG, WebP)"
              />
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Or paste a logo URL"
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welcome Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-600" />
            Welcome Content
          </CardTitle>
          <CardDescription>
            The headline and message displayed in the hero banner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="welcomeTitle" className="text-xs font-medium">Title</Label>
            <Input
              id="welcomeTitle"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              placeholder={`${tenantDefaults?.name || 'Your Institution'} Team Huddle`}
              className="mt-1"
              maxLength={300}
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use &quot;{tenantDefaults?.name || 'Institution'} Team Huddle&quot;</p>
          </div>
          <div>
            <Label htmlFor="welcomeMessage" className="text-xs font-medium">Description</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome to our Team Huddle — your hub for e-learning, career resources, and alumni insights."
              className="mt-1"
              rows={3}
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-teal-600" />
            Layout & Sections
          </CardTitle>
          <CardDescription>
            Configure which sections appear on the landing page and in what order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Featured Section Title */}
          <div>
            <Label className="text-xs font-medium">Featured Section Title</Label>
            <Input
              value={featuredSectionTitle}
              onChange={(e) => setFeaturedSectionTitle(e.target.value)}
              placeholder="Featured Content"
              className="mt-1"
              maxLength={100}
            />
          </div>

          {/* Max Featured Posts */}
          <div>
            <Label className="text-xs font-medium">Max Featured Posts</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="range"
                min={1}
                max={12}
                value={maxFeaturedPosts}
                onChange={(e) => setMaxFeaturedPosts(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <Badge variant="outline" className="text-xs font-mono min-w-[2rem] text-center">
                {maxFeaturedPosts}
              </Badge>
            </div>
          </div>

          {/* Section Order */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Section Order</Label>
            <div className="space-y-1">
              {sectionOrder.map((section, index) => (
                <div key={section} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                  <span className="text-xs font-bold text-slate-400 w-5">{index + 1}</span>
                  <span className="text-sm flex-1">{sectionLabels[section] || section}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveSectionUp(index)} disabled={index === 0}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveSectionDown(index)} disabled={index === sectionOrder.length - 1}>
                    ↓
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Sections */}
          {topics.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Featured Topics
                <span className="text-slate-400 font-normal ml-1">(shown as sections on the landing page)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant={selectedTopicIds.includes(topic.id) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      selectedTopicIds.includes(topic.id)
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'hover:bg-teal-50 hover:border-teal-300'
                    }`}
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {topic.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Select topics to show as dedicated sections. Unselected topics will still be auto-populated if they have content.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Save */}
      <div className="flex items-center justify-between pb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/education/huddle')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/huddle', '_blank')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Open Full Preview
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
