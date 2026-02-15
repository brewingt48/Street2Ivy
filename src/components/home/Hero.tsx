'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/*
 * Carousel images — diverse, inclusive imagery showing:
 * 1-3: Competition & performance (diverse athletes, debate, dance)
 * 4-6: Corporate / professional settings (diverse young professionals)
 * The arc: discipline + competition → corporate leadership
 */
const carouselImages = [
  {
    src: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80',
    alt: 'Diverse athletes competing in a relay race, passing the baton',
  },
  {
    src: 'https://images.unsplash.com/photo-1577416412292-747c6607f055?w=1920&q=80',
    alt: 'Basketball players in intense competition during a college game',
  },
  {
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80',
    alt: 'Diverse group of students celebrating achievement together',
  },
  {
    src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80',
    alt: 'Diverse young professionals collaborating in a modern office',
  },
  {
    src: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1920&q=80',
    alt: 'Young professional woman presenting to a boardroom with confidence',
  },
  {
    src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80',
    alt: 'Diverse team of young professionals shaking hands after a successful deal',
  },
];

interface HeroProps {
  mode?: 'video' | 'carousel';
}

export function Hero({ mode = 'carousel' }: HeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  }, []);

  useEffect(() => {
    if (mode !== 'carousel') return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [mode, nextSlide]);

  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {mode === 'video' ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={carouselImages[0].src}
          className="absolute inset-0 w-full h-full object-cover"
        >
          {/* Replace with Proveground hero video */}
          <source
            src="https://videos.pexels.com/video-files/5190065/5190065-uhd_2560_1440_25fps.mp4"
            type="video/mp4"
          />
        </video>
      ) : (
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1.12 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.2 }, scale: { duration: 8, ease: 'linear' } }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${carouselImages[currentSlide].src})` }}
              role="img"
              aria-label={carouselImages[currentSlide].alt}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/55 via-[#1a1a2e]/35 to-[#1a1a2e]/65" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-[#d4a843] font-medium tracking-[0.25em] text-xs sm:text-sm uppercase mb-5"
        >
          Where Talent Is Proven, Not Presumed
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide"
        >
          You didn&apos;t come
          <br />
          this far to{' '}
          <span className="text-[#d4a843]">stop here.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-5 text-base sm:text-lg text-white/75 max-w-xl mx-auto leading-relaxed"
        >
          AI is reshaping every industry. The skills it can&apos;t replace &mdash; discipline,
          leadership, judgment &mdash; are the ones you&apos;ve already built. Turn your
          competitive edge into career momentum.
        </motion.p>

        {/* CTAs — clean, two buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.05 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-[#d4a843] px-7 py-3 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-lg shadow-[#d4a843]/25"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all duration-200"
          >
            Sign In
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <a href="#the-moment" aria-label="Scroll to learn more">
          <ChevronDown className="h-5 w-5 text-white/40 animate-scroll-indicator" />
        </a>
      </motion.div>

      {/* Carousel dots */}
      {mode === 'carousel' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 1 } : {}}
          transition={{ delay: 1.4 }}
          className="absolute bottom-8 right-8 flex gap-1.5"
        >
          {carouselImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'bg-[#d4a843] w-5' : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
