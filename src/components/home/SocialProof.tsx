'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { SocialProofCopy } from '@/lib/marketing/types';

const DEFAULT_STATS = [
  { value: '500+', label: 'Verified Projects' },
  { value: '25+', label: 'Partner Institutions' },
  { value: '150+', label: 'Employer Partners' },
  { value: '2,000+', label: 'Skills Proven' },
];

interface SocialProofProps {
  copy?: SocialProofCopy;
}

export function SocialProof({ copy }: SocialProofProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const displayStats = copy?.stats?.length
    ? copy.stats.map((s) => ({ value: s.number || '', label: s.label || '' }))
    : DEFAULT_STATS;

  return (
    <section ref={ref} className="bg-[#1a1a2e] py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {displayStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <span className="block font-display text-4xl md:text-5xl text-[#d4a843] leading-none">
                {stat.value}
              </span>
              <span className="block mt-2 text-xs uppercase tracking-[0.15em] text-white/60">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
