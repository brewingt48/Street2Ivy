'use client';

/**
 * VideoPlayer — Reusable accessible video component
 *
 * Supports:
 * - YouTube (iframe embed)
 * - Vimeo (iframe embed)
 * - Direct MP4/WebM (native <video>)
 * - Autoplay background mode (muted, looping)
 * - Responsive aspect ratio
 * - Accessibility (labels, controls)
 */

import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VideoSource = {
  url: string;
  type?: 'youtube' | 'vimeo' | 'mp4' | 'auto';
};

interface VideoPlayerProps {
  src: string;
  /** Display mode */
  mode?: 'player' | 'background';
  /** Aspect ratio class (e.g. "aspect-video", "aspect-[21/9]") */
  aspectRatio?: string;
  /** Auto-detect or specify type */
  type?: 'youtube' | 'vimeo' | 'mp4' | 'auto';
  /** Poster image for native video */
  poster?: string;
  /** Accessibility label */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show player controls (native video only) */
  controls?: boolean;
  /** Autoplay (muted by default for autoplay) */
  autoPlay?: boolean;
  /** Loop video */
  loop?: boolean;
  /** Muted */
  muted?: boolean;
  /** Rounded corners */
  rounded?: boolean;
  /** onClick handler */
  onClick?: () => void;
}

function detectVideoType(url: string): 'youtube' | 'vimeo' | 'mp4' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'mp4';
}

function extractYouTubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || '';
}

export function VideoPlayer({
  src,
  mode = 'player',
  aspectRatio = 'aspect-video',
  type = 'auto',
  poster,
  title = 'Video',
  className,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  rounded = true,
  onClick,
}: VideoPlayerProps) {
  const videoType = type === 'auto' ? detectVideoType(src) : type;
  const isBackground = mode === 'background';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted || autoPlay);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  // ── Background mode (hero/ambient) ──
  if (isBackground) {
    if (videoType === 'mp4') {
      return (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          poster={poster}
          className={cn('absolute inset-0 w-full h-full object-cover', className)}
          aria-label={title}
        />
      );
    }

    // YouTube/Vimeo background — use iframe with no controls
    if (videoType === 'youtube') {
      const videoId = extractYouTubeId(src);
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
          className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
          style={{ transform: 'scale(1.2)' }}
          allow="autoplay; encrypted-media"
          tabIndex={-1}
          aria-label={title}
        />
      );
    }

    if (videoType === 'vimeo') {
      const videoId = extractVimeoId(src);
      return (
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`}
          className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
          style={{ transform: 'scale(1.2)' }}
          allow="autoplay"
          tabIndex={-1}
          aria-label={title}
        />
      );
    }
  }

  // ── Player mode ──
  const containerClasses = cn(
    'relative overflow-hidden bg-slate-900 group',
    aspectRatio,
    rounded && 'rounded-xl',
    onClick && 'cursor-pointer',
    className
  );

  // YouTube embed
  if (videoType === 'youtube') {
    const videoId = extractYouTubeId(src);
    return (
      <div className={containerClasses} onClick={onClick}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  // Vimeo embed
  if (videoType === 'vimeo') {
    const videoId = extractVimeoId(src);
    return (
      <div className={containerClasses} onClick={onClick}>
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?autoplay=${autoPlay ? 1 : 0}`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  // Native video (MP4/WebM)
  return (
    <div className={containerClasses} onClick={onClick}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        controls={false}
        className="absolute inset-0 w-full h-full object-cover"
        aria-label={title}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Custom controls overlay */}
      {controls && (
        <div className="absolute inset-0 flex items-end">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Controls bar */}
          <div className="relative z-10 w-full px-4 py-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <div className="flex-1" />

            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
              aria-label="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Play button overlay (when paused and not hovered) */}
      {!playing && !autoPlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all text-white hover:scale-110"
            aria-label="Play video"
          >
            <Play className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
}
