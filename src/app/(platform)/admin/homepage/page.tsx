'use client';

/**
 * Admin Homepage CMS
 *
 * Allows admin to:
 * - Hide/show homepage sections
 * - Upload/edit logo URL
 * - Edit hero copy, problem copy, CTA copy
 * - Set Book Demo URL
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Image,
  Type,
  Link as LinkIcon,
  RotateCcw,
} from 'lucide-react';

interface Settings {
  bookDemoUrl: string;
  logoUrl: string;
  hiddenSections: string[];
  aiCoachingEnabled: boolean;
  aiCoachingUrl: string;
  heroCopy: {
    headline?: string;
    subheadline?: string;
  };
  problemCopy: {
    headline?: string;
    stats?: Array<{ value?: string; label?: string }>;
  };
  ctaCopy: {
    headline?: string;
    subheadline?: string;
  };
}

const ALL_SECTIONS = [
  { id: 'hero', label: 'Hero Banner', description: 'Full-screen video hero with headline' },
  { id: 'problem', label: 'The Problem / Opportunity', description: 'Statistics about the talent gap' },
  { id: 'how-it-works', label: 'How It Works', description: '3-step process explanation' },
  { id: 'value-props', label: 'Value Propositions', description: 'Solutions for students, corporates, and institutions' },
  { id: 'white-label', label: 'White Label', description: 'White-label platform showcase with mockup' },
  { id: 'ai-coaching', label: 'AI Coaching', description: 'AI career coaching feature section' },
  { id: 'social-proof', label: 'Social Proof', description: 'Stats, partner logos, and testimonials' },
  { id: 'video', label: 'Video Content', description: 'Platform demo video section' },
  { id: 'faq', label: 'FAQ', description: 'Frequently asked questions accordion — manage content in FAQ Manager' },
  { id: 'cta', label: 'CTA Footer', description: 'Bottom call-to-action with Book Demo' },
];

const DEFAULTS: Settings = {
  bookDemoUrl: 'https://calendly.com',
  logoUrl: '',
  hiddenSections: [],
  aiCoachingEnabled: false,
  aiCoachingUrl: '',
  heroCopy: {},
  problemCopy: {},
  ctaCopy: {},
};

export default function AdminHomepageCMS() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({ ...DEFAULTS, ...d.settings });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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

  const toggleSection = (sectionId: string) => {
    setSettings((prev) => {
      const hidden = prev.hiddenSections || [];
      return {
        ...prev,
        hiddenSections: hidden.includes(sectionId)
          ? hidden.filter((s) => s !== sectionId)
          : [...hidden, sectionId],
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Homepage Editor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Control what visitors see on the landing page
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700"
          >
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

      {/* Section Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Section Visibility
          </CardTitle>
          <CardDescription>
            Show or hide any section of the homepage. Hidden sections won&apos;t appear to visitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {ALL_SECTIONS.map((section) => {
              const isHidden = (settings.hiddenSections || []).includes(section.id);
              return (
                <div
                  key={section.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isHidden
                      ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/50'
                      : 'bg-white border-teal-200 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${isHidden ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {section.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isHidden ? 'outline' : 'default'}
                    className={isHidden ? '' : 'bg-teal-600 hover:bg-teal-700'}
                    onClick={() => toggleSection(section.id)}
                  >
                    {isHidden ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> Hidden
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Visible
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Logo & Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-teal-600" />
            Logo & Branding
          </CardTitle>
          <CardDescription>Upload a logo URL to replace the text logo in the navigation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={settings.logoUrl}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">
              Enter a URL to a PNG or SVG logo. Leave blank to use the text logo.
            </p>
          </div>
          {settings.logoUrl && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoUrl}
                alt="Logo preview"
                className="h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Demo URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-teal-600" />
            Book a Demo Link
          </CardTitle>
          <CardDescription>
            Set the URL for the &quot;Book a Demo&quot; buttons throughout the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bookDemoUrl">Demo Booking URL</Label>
            <Input
              id="bookDemoUrl"
              value={settings.bookDemoUrl}
              onChange={(e) => setSettings({ ...settings, bookDemoUrl: e.target.value })}
              placeholder="https://calendly.com/your-link"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">
              This link appears on the hero, navigation bar, and CTA section. Default: Calendly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Current: {settings.bookDemoUrl || 'https://calendly.com'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSettings({ ...settings, bookDemoUrl: 'https://calendly.com' })}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset to Calendly
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hero Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-600" />
            Hero Section Copy
          </CardTitle>
          <CardDescription>
            Customize the main headline and description on the hero banner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="heroHeadline">Headline</Label>
            <Input
              id="heroHeadline"
              value={settings.heroCopy?.headline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  heroCopy: { ...settings.heroCopy, headline: e.target.value },
                })
              }
              placeholder="Where Talent Meets Opportunity"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use the default headline.</p>
          </div>
          <div>
            <Label htmlFor="heroSubheadline">Subheadline</Label>
            <Textarea
              id="heroSubheadline"
              value={settings.heroCopy?.subheadline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  heroCopy: { ...settings.heroCopy, subheadline: e.target.value },
                })
              }
              placeholder="Campus2Career connects students with real corporate projects — building careers before graduation."
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Problem Section Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-600" />
            Problem Section Copy
          </CardTitle>
          <CardDescription>
            Customize the &quot;The Challenge&quot; section headline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="problemHeadline">Section Headline</Label>
            <Input
              id="problemHeadline"
              value={settings.problemCopy?.headline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  problemCopy: { ...settings.problemCopy, headline: e.target.value },
                })
              }
              placeholder="The Talent Gap Is Real"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* CTA Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-600" />
            CTA Section Copy
          </CardTitle>
          <CardDescription>
            Customize the bottom call-to-action section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ctaHeadline">CTA Headline</Label>
            <Textarea
              id="ctaHeadline"
              value={settings.ctaCopy?.headline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ctaCopy: { ...settings.ctaCopy, headline: e.target.value },
                })
              }
              placeholder="Ready to Bridge the Gap Between Campus and Career?"
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ctaSubheadline">CTA Subheadline</Label>
            <Input
              id="ctaSubheadline"
              value={settings.ctaCopy?.subheadline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ctaCopy: { ...settings.ctaCopy, subheadline: e.target.value },
                })
              }
              placeholder="Book a demo to see how Campus2Career can transform your talent pipeline."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-600" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">
            Save your changes, then view the live homepage to see updates.
          </p>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Open Homepage
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
