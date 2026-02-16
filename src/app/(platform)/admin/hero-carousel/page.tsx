'use client';

/**
 * Admin Hero Carousel Management
 *
 * Allows system admin to:
 * - Add/remove/reorder hero carousel images (via URL)
 * - Set rotation timing (interval between slides)
 * - Preview the carousel live
 * - Reset to default images
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
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Image as ImageIcon,
  Clock,
  Eye,
  GripVertical,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Default images (same as Hero.tsx hardcoded ones)
// ---------------------------------------------------------------------------

const DEFAULT_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80', alt: 'College football players competing under stadium lights' },
  { src: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80', alt: 'Basketball player driving to the hoop with determination' },
  { src: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1920&q=80', alt: 'Women\u2019s college soccer \u2014 athletes battling for possession' },
  { src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80', alt: 'Female sprinter exploding off the blocks with power and focus' },
  { src: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1920&q=80', alt: 'Women\u2019s volleyball team competing in an intense college match' },
  { src: 'https://images.unsplash.com/photo-1496318447583-f524534e9ce1?w=1920&q=80', alt: 'College lacrosse player cradling the ball downfield at full speed' },
  { src: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80', alt: 'College swimmer cutting through the water with explosive form' },
  { src: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1920&q=80', alt: 'Young Black woman presenting confidently to a boardroom' },
  { src: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1920&q=80', alt: 'Diverse young professionals shaking hands in a modern corporate office' },
  { src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1920&q=80', alt: 'Young diverse executive presenting strategy to colleagues in a glass conference room' },
  { src: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=80', alt: 'Sharp young professionals collaborating around a conference table' },
  { src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80', alt: 'Diverse team of young professionals closing a deal with a handshake' },
];

const DEFAULT_INTERVAL_MS = 3500;

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
}: {
  images: CarouselImage[];
  intervalMs: number;
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
    <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden bg-slate-900">
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
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images[currentSlide].src})` }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/55 via-[#1a1a2e]/35 to-[#1a1a2e]/65" />
      <div className="absolute bottom-3 right-3 flex gap-1">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-[#d4a843] w-4' : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
      <div className="absolute bottom-3 left-3">
        <Badge className="bg-black/40 border-0 text-white/80 text-xs">
          {currentSlide + 1} / {images.length}
        </Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdminHeroCarouselPage() {
  const [images, setImages] = useState<CarouselImage[]>(DEFAULT_IMAGES);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);
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
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const carousel = d.settings?.heroCarousel;
        if (carousel?.images && carousel.images.length > 0) {
          setImages(carousel.images);
        }
        if (carousel?.intervalMs) {
          setIntervalMs(carousel.intervalMs);
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
      const res = await csrfFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroCarousel: {
            images,
            intervalMs,
          },
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

  // Reset to defaults
  const handleReset = () => {
    if (!confirm('Reset to default images? This will discard your current changes.')) return;
    setImages(DEFAULT_IMAGES);
    setIntervalMs(DEFAULT_INTERVAL_MS);
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Hero Carousel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage the rotating background images on the homepage hero section
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

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-600" />
            Live Preview
          </CardTitle>
          <CardDescription>
            This preview cycles through your images at the configured speed with the same animation as the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarouselPreview images={images} intervalMs={intervalMs} />
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
                Minimum: 1s &middot; Maximum: 15s &middot; Default: 3.5s
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
                Add image URLs, reorder with arrows, and set alt text for accessibility. Images rotate in the order shown.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              No images added. Add an image below or reset to defaults.
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
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Add New Image</p>
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
              Add Image
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
