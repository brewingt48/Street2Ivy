'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function ClosingCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-24 md:py-32 px-6 bg-white overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.06) 0%, transparent 70%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl text-[#1a1a2e] tracking-wide leading-[1.05] mb-5"
        >
          This is your{' '}
          <span className="text-[#d4a843]">ground.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-[#3a3a3a]/80 text-base leading-relaxed max-w-lg mx-auto mb-8"
        >
          Where talent is proven, not presumed. Students, partners, and programs
          building the future &mdash; together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#d4a843] px-7 py-3 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-lg shadow-[#d4a843]/20"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/15 px-7 py-3 text-sm font-semibold text-[#1a1a2e] hover:border-[#1a1a2e]/30 transition-all duration-200"
          >
            Sign In
          </a>
        </motion.div>
      </div>
    </section>
  );
}
