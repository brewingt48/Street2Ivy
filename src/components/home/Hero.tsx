'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/* ── Carousel images (placeholders — replace with final Proveground shots) ── */
const carouselImages = [
  {
    src: 'https://images.unsplash.com/photo-1461896836934-bd45ba8b2cda?w=1920&q=80',
    alt: 'Student-athletes competing on the track',
  },
  {
    src: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=1920&q=80',
    alt: 'Football players in competition',
  },
  {
    src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1920&q=80',
    alt: 'Dance performance on stage',
  },
  {
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&q=80',
    alt: 'Young professionals collaborating in boardroom',
  },
  {
    src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&q=80',
    alt: 'Students presenting in professional setting',
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

  /* Auto-advance carousel */
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
      {/* ── Background: Video or Carousel ── */}
      {mode === 'video' ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1461896836934-bd45ba8b2cda?w=1920&q=80"
          className="absolute inset-0 w-full h-full object-cover"
        >
          {/* Replace with Proveground hero video */}
          <source
            src="https://videos.pexels.com/video-files/5190065/5190065-uhd_2560_1440_25fps.mp4"
            type="video/mp4"
          />
        </video>
      ) : (
        /* Carousel */
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1.12 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1 }, scale: { duration: 8, ease: 'linear' } }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${carouselImages[currentSlide].src})` }}
              role="img"
              aria-label={carouselImages[currentSlide].alt}
            />
          </AnimatePresence>
        </div>
      )}

      {/* White overlay for bright look */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/60 via-[#1a1a2e]/40 to-[#1a1a2e]/70" />

      {/* ── Content ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-[#d4a843] font-medium tracking-[0.25em] text-xs sm:text-sm uppercase mb-6"
        >
          Where Talent Is Proven, Not Presumed
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide"
        >
          You didn&apos;t come this far
          <br />
          to{' '}
          <span className="text-[#d4a843]">stop here.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
        >
          Proveground connects high-performing students with alumni and corporate partners
          through real internships and project work — turning discipline into reputation
          and reputation into opportunity.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/register?role=student"
            className="inline-flex items-center justify-center rounded-full bg-[#d4a843] px-8 py-3.5 text-base font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-xl shadow-[#d4a843]/25 hover:shadow-[#d4a843]/40"
          >
            I&apos;m a Student
          </a>
          <a
            href="/register?role=alumni"
            className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200"
          >
            I&apos;m an Alumni Partner
          </a>
          <a
            href="/register?role=institution"
            className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-white/70 hover:text-[#d4a843] transition-colors duration-200 underline underline-offset-4 decoration-white/30 hover:decoration-[#d4a843]"
          >
            I&apos;m a Program / Institution
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <a href="#the-moment" aria-label="Scroll to learn more">
          <ChevronDown className="h-6 w-6 text-white/50 animate-scroll-indicator" />
        </a>
      </motion.div>

      {/* Carousel dots */}
      {mode === 'carousel' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 1 } : {}}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 right-8 flex gap-2"
        >
          {carouselImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'bg-[#d4a843] w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
