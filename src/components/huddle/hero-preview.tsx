'use client';

/**
 * HeroPreview — Sticky live-preview card for the Huddle branding admin page.
 *
 * Shows a compact, non-interactive replica of the Team Huddle hero banner
 * that updates in real-time as the admin edits branding fields.
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layout,
  Library,
  PenTool,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeroPreviewProps {
  bannerType: 'image' | 'video' | 'none';
  bannerImageUrl: string;
  bannerVideoUrl: string;
  bannerOverlayOpacity: number;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeTitle: string;
  welcomeMessage: string;
  tenantName: string;
  sectionOrder: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroPreview({
  bannerType,
  bannerImageUrl,
  bannerVideoUrl,
  bannerOverlayOpacity,
  logoUrl,
  primaryColor,
  secondaryColor,
  welcomeTitle,
  welcomeMessage,
  tenantName,
  sectionOrder,
}: HeroPreviewProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sectionLabels: Record<string, string> = {
    featured: 'Featured',
    topics: 'Topics',
    recent: 'Recent',
  };

  return (
    <Card className="sticky top-[4.5rem] z-40 shadow-md border-teal-200 dark:border-teal-800">
      <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-teal-600" />
            Live Preview
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-4 pb-4 pt-0">
          {/* Hero Banner Preview */}
          {bannerType !== 'none' ? (
            <div className="relative rounded-lg overflow-hidden" style={{ minHeight: '160px' }}>
              {/* Background */}
              {bannerType === 'video' && bannerVideoUrl ? (
                <video
                  src={bannerVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : bannerImageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${bannerImageUrl})` }}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                />
              )}

              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, rgba(0,0,0,${bannerOverlayOpacity}) 0%, rgba(0,0,0,${bannerOverlayOpacity + 0.2}) 100%)`,
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-8">
                {logoUrl && (
                  <div className="mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt={tenantName}
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                )}

                <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">
                  {welcomeTitle || `${tenantName} Team Huddle`}
                </h2>

                {welcomeMessage && (
                  <p className="mt-1.5 text-xs text-white/90 max-w-md drop-shadow line-clamp-2">
                    {welcomeMessage}
                  </p>
                )}

                {/* Decorative nav buttons (non-functional in preview) */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded bg-white/20 text-white border border-white/30">
                    <Layout className="h-3 w-3" />
                    Browse
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded text-white border border-white/20">
                    <Library className="h-3 w-3" />
                    Library
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded text-white border border-white/20">
                    <PenTool className="h-3 w-3" />
                    Contribute
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* No banner — compact layout preview */
            <div
              className="rounded-lg p-4 flex items-center justify-between"
              style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}
            >
              <div className="flex items-center gap-3">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={tenantName} className="h-6 w-auto object-contain" />
                )}
                <div>
                  <p className="text-sm font-bold" style={{ color: primaryColor }}>
                    {welcomeTitle || `${tenantName} Team Huddle`}
                  </p>
                  {welcomeMessage && (
                    <p className="text-xs text-slate-500 line-clamp-1">{welcomeMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium rounded border" style={{ borderColor: `${primaryColor}40`, color: primaryColor }}>
                  <Layout className="h-2.5 w-2.5" />
                  Browse
                </span>
              </div>
            </div>
          )}

          {/* Section order indicator */}
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-slate-400 mr-1">Sections:</span>
            {sectionOrder.map((section, i) => (
              <span key={section} className="flex items-center">
                {i > 0 && <span className="text-slate-300 mx-0.5 text-[10px]">→</span>}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: `${primaryColor}10`,
                    color: primaryColor,
                  }}
                >
                  {sectionLabels[section] || section}
                </span>
              </span>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
