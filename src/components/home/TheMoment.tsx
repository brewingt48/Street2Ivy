'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Zap, Users, Target } from 'lucide-react';

const pillars = [
  {
    icon: TrendingUp,
    label: 'The Shift',
    stat: '85%',
    statLabel: 'of entry-level tasks automatable by 2027',
    body: 'Entry-level work is being automated. The tasks that once trained new grads are now handled by AI.',
  },
  {
    icon: Zap,
    label: 'The Opportunity',
    stat: '3×',
    statLabel: 'higher placement for work-experienced grads',
    body: 'Real work builds what AI can\u2019t replace — judgment, collaboration, and leadership under pressure.',
  },
  {
    icon: Users,
    label: 'The Advantage',
    stat: '92%',
    statLabel: 'of employers value verified project work',
    body: 'Programs that connect students to real corporate work through alumni networks define what comes next.',
  },
  {
    icon: Target,
    label: 'The Answer',
    stat: '1',
    statLabel: 'platform to prove it all',
    body: 'Proveground is where students prove themselves through real work and build verified reputations.',
  },
];

export function TheMoment() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="the-moment" className="relative py-28 md:py-36 px-6 overflow-hidden">
      {/* Premium background — subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#1e2140] to-[#1a1a2e]" />

      {/* Decorative accent glow */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at center, rgba(212,168,67,0.3) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none opacity-10"
        style={{
          background: 'radial-gradient(circle at center, rgba(58,123,213,0.4) 0%, transparent 70%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto">
        {/* Header — centered, commanding */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 px-4 py-1.5 mb-6"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse" />
            <span className="text-[#d4a843] text-xs font-semibold uppercase tracking-[0.2em]">
              The Moment
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[1.05] mb-6"
          >
            The world changed.
            <br />
            <span className="text-[#d4a843]">The smartest are moving.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
          >
            AI isn&apos;t a threat — it&apos;s a signal. The old career ladder is being
            rebuilt in real time. The programs, students, and companies willing to
            move differently will define what comes next.
          </motion.p>
        </div>

        {/* Pillar Cards — premium grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="group relative bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-6 hover:bg-white/[0.08] hover:border-[#d4a843]/20 transition-all duration-500"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-[#d4a843]/10 flex items-center justify-center mb-5 group-hover:bg-[#d4a843]/20 transition-colors duration-300">
                <pillar.icon className="h-5 w-5 text-[#d4a843]" />
              </div>

              {/* Stat — big, impactful */}
              <p className="font-display text-4xl text-white tracking-wider mb-0.5">
                {pillar.stat}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium mb-4 leading-snug">
                {pillar.statLabel}
              </p>

              {/* Label + body */}
              <h3 className="text-sm font-semibold text-[#d4a843] uppercase tracking-[0.1em] mb-2">
                {pillar.label}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
          className="mt-16 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-[#d4a843]/40 to-transparent origin-center"
        />
      </div>
    </section>
  );
}
