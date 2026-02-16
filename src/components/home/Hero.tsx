'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/*
 * Carousel images — 1 photo per sport + diverse young professionals.
 * Alternates between athletic competition and sharp executive settings.
 */
const carouselImages = [
  // --- SPORTS (1 per sport) ---
  {
    src: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920&q=80',
    alt: 'College football players competing under stadium lights',
  },
  {
    src: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&q=80',
    alt: 'Basketball player driving to the hoop with determination',
  },
  {
    src: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1920&q=80',
    alt: 'Women\u2019s college soccer \u2014 athletes battling for possession',
  },
  {
    src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80',
    alt: 'Female sprinter exploding off the blocks with power and focus',
  },
  {
    src: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1920&q=80',
    alt: 'Women\u2019s volleyball team competing in an intense college match',
  },
  {
    src: 'https://images.unsplash.com/photo-1496318447583-f524534e9ce1?w=1920&q=80',
    alt: 'College lacrosse player cradling the ball downfield at full speed',
  },
  {
    src: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80',
    alt: 'College swimmer cutting through the water with explosive form',
  },
  // --- DIVERSE YOUNG PROFESSIONALS (sharp, executive settings) ---
  {
    src: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1920&q=80',
    alt: 'Young Black woman presenting confidently to a boardroom',
  },
  {
    src: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1920&q=80',
    alt: 'Diverse young professionals shaking hands in a modern corporate office',
  },
  {
    src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1920&q=80',
    alt: 'Young diverse executive presenting strategy to colleagues in a glass conference room',
  },
  {
    src: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=80',
    alt: 'Sharp young professionals collaborating around a conference table',
  },
  {
    src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80',
    alt: 'Diverse team of young professionals closing a deal with a handshake',
  },
];

const DEMO_URL = 'https://calendly.com/proveground/demo';

interface HeroProps {
  mode?: 'video' | 'carousel';
  images?: Array<{ src: string; alt: string }>;
  intervalMs?: number;
}

export function Hero({ mode = 'carousel', images, intervalMs = 3500 }: HeroProps) {
  const [loaded, setLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use admin-configured images if provided, otherwise fall back to hardcoded defaults
  const activeImages = images && images.length > 0 ? images : carouselImages;

  useEffect(() => {
    setLoaded(true);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % activeImages.length);
  }, [activeImages.length]);

  useEffect(() => {
    if (mode !== 'carousel') return;
    const timer = setInterval(nextSlide, intervalMs);
    return () => clearInterval(timer);
  }, [mode, nextSlide, intervalMs]);

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) {
      const offset = 80; // slight offset so heading isn't jammed against top
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

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
          poster={activeImages[0].src}
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
              style={{ backgroundImage: `url(${activeImages[currentSlide].src})` }}
              role="img"
              aria-label={activeImages[currentSlide].alt}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/55 via-[#1a1a2e]/35 to-[#1a1a2e]/65" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide uppercase"
        >
          Where Talent Is
          <br />
          <span className="text-[#d4a843]">Proven,</span> Not Presumed
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 flex flex-col items-center gap-1"
        >
          <span className="text-base sm:text-lg text-white/85 font-medium">Schools build it.</span>
          <span className="text-base sm:text-lg text-white/85 font-medium">Alumni fuel it.</span>
          <span className="text-base sm:text-lg text-white/85 font-medium">Companies power it.</span>
          <span className="text-base sm:text-lg text-[#d4a843] font-medium">Students prove it.</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-5 text-base sm:text-lg text-white/75 max-w-xl mx-auto leading-relaxed"
        >
          ProveGround gives every network its own branded talent engine &mdash; turning
          real project work into verified results that launch careers.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 1.05 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#how-it-works"
            onClick={scrollToHowItWorks}
            className="inline-flex items-center justify-center rounded-full bg-[#d4a843] px-7 py-3 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-lg shadow-[#d4a843]/25"
          >
            See How It Works
          </a>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all duration-200"
          >
            Request a Demo
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
        <a
          href="#how-it-works"
          onClick={scrollToHowItWorks}
          aria-label="Scroll to learn more"
        >
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
          {activeImages.map((_, i) => (
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
