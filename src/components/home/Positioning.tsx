'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PositioningCopy } from '@/lib/marketing/types';

interface PositioningProps {
  copy?: PositioningCopy;
}

export function Positioning({ copy }: PositioningProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="bg-white py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {/* Decorative gold accent line */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-10 h-px w-16 origin-center bg-[#d4a843]"
        />

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1a1a2e] leading-snug"
        >
          {copy?.headline ? copy.headline : (<>Job boards show who applied.<br className="hidden sm:block" />{' '}We show who&rsquo;s ready.</>)}
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-base text-[#3a3a3a]/80 leading-relaxed max-w-2xl mx-auto"
        >
          {copy?.description || 'Most career platforms help students find listings and submit applications. Proveground helps them become the candidates who actually get hired. Through verified project work, AI-powered coaching, and measurable skill development, students build the proof that sets them apart \u2014 on any platform, in any application, for any role.'}
        </motion.p>

        {/* Decorative gold accent line */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mx-auto mt-10 h-px w-16 origin-center bg-[#d4a843]"
        />
      </div>
    </section>
  );
}
