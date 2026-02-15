'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/*
 * Carousel images — all college sports, grouped by sport.
 * Prioritizes diversity: women, men, people of color.
 * No corporate photos — the focus is the athlete.
 */
const carouselImages = [
  // --- FOOTBALL (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80',
    alt: 'College football players competing on the field under stadium lights',
  },
  {
    src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80',
    alt: 'Football team huddle — discipline and leadership on the field',
  },
  // --- BASKETBALL (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80',
    alt: 'Basketball player driving to the hoop with determination',
  },
  {
    src: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=1920&q=80',
    alt: 'Intense basketball game — players competing under the lights',
  },
  // --- WOMEN'S SOCCER (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1920&q=80',
    alt: 'Women\u2019s college soccer — athletes battling for possession on the pitch',
  },
  {
    src: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1920&q=80',
    alt: 'College soccer match — diverse players sprinting downfield',
  },
  // --- TRACK & FIELD (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80',
    alt: 'Female sprinter exploding off the blocks with power and focus',
  },
  {
    src: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80',
    alt: 'Diverse athletes competing in a relay race, passing the baton',
  },
  // --- VOLLEYBALL (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1920&q=80',
    alt: 'Women\u2019s volleyball team competing in an intense college match',
  },
  {
    src: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=80',
    alt: 'College volleyball — athlete leaping for a powerful spike at the net',
  },
  // --- LACROSSE (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1496318447583-f524534e9ce1?w=1920&q=80',
    alt: 'College lacrosse player cradling the ball downfield at full speed',
  },
  {
    src: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=1920&q=80',
    alt: 'Women\u2019s lacrosse — athletes competing with agility and precision',
  },
  // --- SWIMMING (grouped) ---
  {
    src: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80',
    alt: 'College swimmer cutting through the water with explosive form',
  },
  {
    src: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=1920&q=80',
    alt: 'Swimmers diving off the blocks at a collegiate competition',
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
    const timer = setInterval(nextSlide, 3500);
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
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1.08 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.6 }, scale: { duration: 4, ease: 'linear' } }}
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
          The discipline, resilience, and leadership you&apos;ve built through competition
          are exactly what the world needs now. Turn your competitive edge into
          career momentum &mdash; and prove what you&apos;re made of.
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
