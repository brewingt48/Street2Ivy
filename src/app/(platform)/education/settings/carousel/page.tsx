'use client';

/**
 * Tenant Hero Carousel Management
 *
 * Allows education admins to:
 * - Add/remove/reorder hero carousel images (via upload or URL)
 * - Set rotation timing (interval between slides)
 * - Preview the carousel live
 * - Clear carousel to revert to single hero video/image
 *
 * Saves via PUT /api/tenant/branding with heroCarousel field.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Image as ImageIcon,
  Clock,
  Eye,
  GripVertical,
  Upload,
  ArrowLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarouselImage {
  src: string;
  alt: string;
}

// ---------------------------------------------------------------------------
// Live Preview Component
// ---------------------------------------------------------------------------

function CarouselPreview({
  images,
  intervalMs,
  primaryColor,
}: {
  images: CarouselImage[];
  intervalMs: number;
  primaryColor: string;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length === 0) return;
    setCurrentSlide(0);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(nextSlide, intervalMs);
    return () => clearInterval(timer);
  }, [nextSlide, intervalMs, images.length]);

  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        <p className="text-sm text-slate-400">No images to preview</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden" style={{ backgroundColor: primaryColor }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.6 },
            scale: { duration: 4, ease: 'linear' },
          }}
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${images[currentSlide].src})` }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/20" />
      {/* Dot indicators */}
      <div className="absolute bottom-3 right-3 flex gap-1 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
      <div className="absolute bottom-3 left-3 z-10">
        <Badge className="bg-black/40 border-0 text-white/80 text-xs">
          {currentSlide + 1} / {images.length}
        </Badge>
      </div>
      {/* Sample text overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <p className="text-white/80 text-lg font-bold">Your Hero Section</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function TenantCarouselPage() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [currentHeroPoster, setCurrentHeroPoster] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Add image form state
  const [newUrl, setNewUrl] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [urlPreviewError, setUrlPreviewError] = useState(false);

  // Fetch existing settings
  useEffect(() => {
    Promise.all([
      fetch('/api/tenant/branding').then((r) => r.json()),
      fetch('/api/education/settings').then((r) => r.json()),
    ])
      .then(([brandingData, settingsData]) => {
        const carousel = brandingData.branding?.heroCarousel;
        if (carousel?.images && carousel.images.length > 0) {
          setImages(carousel.images);
        }
        if (carousel?.intervalMs) {
          setIntervalMs(carousel.intervalMs);
        }
        if (settingsData.tenant?.branding?.primaryColor) {
          setPrimaryColor(settingsData.tenant.branding.primaryColor);
        }
        // Remember the current hero poster image so we can offer to add it
        const posterUrl = brandingData.branding?.heroVideoPosterUrl;
        if (posterUrl) {
          setCurrentHeroPoster(posterUrl);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const heroCarousel = images.length > 0 ? { images, intervalMs } : null;
      const res = await csrfFetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroCarousel }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        // Show detailed validation errors if available
        let msg = d.error || 'Failed to save';
        if (d.details) {
          const detailMessages = Object.entries(d.details)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join('; ');
          if (detailMessages) msg += ` — ${detailMessages}`;
        }
        setError(msg);
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Add image
  const handleAddImage = () => {
    if (!newUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      { src: newUrl.trim(), alt: newAlt.trim() || 'Hero image' },
    ]);
    setNewUrl('');
    setNewAlt('');
    setUrlPreviewError(false);
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Move image up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const newImages = [...prev];
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      return newImages;
    });
  };

  // Move image down
  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const newImages = [...prev];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      return newImages;
    });
  };

  // Update alt text
  const handleUpdateAlt = (index: number, alt: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img))
    );
  };

  // Clear carousel (revert to single hero video/image)
  const handleClear = () => {
    if (!confirm('Clear all carousel images? Your landing page will revert to the single hero video/image.')) return;
    setImages([]);
    setIntervalMs(5000);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/education/settings"
              className="text-sm text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Settings
            </a>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Hero Carousel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Add rotating background images to your landing page hero section
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

      {/* Info */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 p-4 text-sm text-blue-700 dark:text-blue-300">
        <p>
          <strong>How it works:</strong> When you add carousel images, your landing page hero section will
          rotate through them with a Ken Burns animation effect. If no carousel images are configured,
          it falls back to the single hero video or poster image from your branding settings.
        </p>
      </div>

      {/* Current hero image notice — offer to include in carousel */}
      {currentHeroPoster && images.length === 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4">
          <div className="flex items-start gap-4">
            <div className="w-24 h-16 rounded-md overflow-hidden bg-slate-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentHeroPoster}
                alt="Current hero image"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Current Hero Image
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Your landing page currently uses this image as the hero background. Add it to the
                carousel to keep it as part of the rotation.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs border-amber-300 hover:bg-amber-100"
                onClick={() => {
                  setImages([{ src: currentHeroPoster, alt: 'Hero background image' }]);
                  setCurrentHeroPoster(null);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Carousel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Live Preview
          </CardTitle>
          <CardDescription>
            Preview how the carousel will look on your landing page hero section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarouselPreview images={images} intervalMs={intervalMs} primaryColor={primaryColor} />
        </CardContent>
      </Card>

      {/* Rotation Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            Rotation Timing
          </CardTitle>
          <CardDescription>
            How long each image stays on screen before transitioning to the next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="intervalMs">Interval (seconds)</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  id="intervalMs"
                  type="range"
                  min={1000}
                  max={15000}
                  step={500}
                  value={intervalMs}
                  onChange={(e) => setIntervalMs(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <Badge variant="outline" className="text-sm font-mono min-w-[4.5rem] text-center">
                  {(intervalMs / 1000).toFixed(1)}s
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Minimum: 1s &middot; Maximum: 15s &middot; Default: 5s
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-teal-600" />
                Carousel Images ({images.length})
              </CardTitle>
              <CardDescription className="mt-1">
                Add image URLs or upload images, reorder with arrows, and set alt text for accessibility.
              </CardDescription>
            </div>
            {images.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              No carousel images configured. Your landing page will use the single hero video/image.
              <br />
              Add images below to enable the rotating carousel.
            </div>
          )}

          {images.map((image, index) => (
            <div
              key={`${index}-${image.src.slice(-20)}`}
              className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              {/* Order indicator */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <GripVertical className="h-4 w-4 text-slate-300" />
                <span className="text-xs font-bold text-slate-400">{index + 1}</span>
              </div>

              {/* Thumbnail */}
              <div className="w-20 h-14 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              {/* URL + Alt text */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                  {image.src}
                </p>
                <Input
                  value={image.alt}
                  onChange={(e) => handleUpdateAlt(index, e.target.value)}
                  placeholder="Alt text for accessibility"
                  className="h-7 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === images.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add New Image */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" />
              Add New Image
            </p>

            {/* Upload Zone */}
            <FileUpload
              onUpload={(url) => {
                setImages((prev) => [
                  ...prev,
                  { src: url, alt: newAlt.trim() || 'Hero image' },
                ]);
                setNewAlt('');
              }}
              accept="image/png,image/jpeg,image/gif,image/webp"
              maxSizeMB={10}
              folder="tenant/hero"
            />

            {/* Divider */}
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              <span className="px-3 text-xs text-slate-400 bg-white dark:bg-slate-900">or paste a URL</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>

            {/* URL Input */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <div>
                  <Label htmlFor="newImageUrl" className="text-xs">Image URL</Label>
                  <Input
                    id="newImageUrl"
                    value={newUrl}
                    onChange={(e) => {
                      setNewUrl(e.target.value);
                      setUrlPreviewError(false);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="newImageAlt" className="text-xs">Alt Text (describes the image)</Label>
                  <Input
                    id="newImageAlt"
                    value={newAlt}
                    onChange={(e) => setNewAlt(e.target.value)}
                    placeholder="e.g. Student athletes competing on the field"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* URL Preview */}
              {newUrl && (
                <div className="w-24 h-[4.5rem] rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 self-end">
                  {!urlPreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={newUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setUrlPreviewError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleAddImage}
              disabled={!newUrl.trim()}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Image via URL
            </Button>

            {urlPreviewError && newUrl && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Image URL could not be loaded. You can still add it, but verify the URL is correct.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save */}
      <div className="flex items-center justify-between pb-8">
        <Badge variant="outline" className="text-xs text-slate-400">
          {images.length} image{images.length !== 1 ? 's' : ''} &middot; {(intervalMs / 1000).toFixed(1)}s interval
        </Badge>
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
  );
}
