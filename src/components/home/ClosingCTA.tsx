'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function ClosingCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-24 md:py-32 px-6 bg-white overflow-hidden">
      {/* Subtle radial gold glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.08) 0%, transparent 70%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl text-[#1a1a2e] tracking-wide leading-[1.05] mb-6"
        >
          The best talent doesn&apos;t wait
          <br />
          to be{' '}
          <span className="text-[#d4a843]">discovered.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-[#3a3a3a] text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10"
        >
          The market is shifting. The programs, partners, and students who move now won&apos;t
          just keep up &mdash; they&apos;ll set the pace. Whether you&apos;re ready to prove what
          you&apos;re made of, invest in the next class, or lead the change &mdash; this is your
          ground.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/register?role=institution"
            className="inline-flex items-center gap-2 rounded-full bg-[#d4a843] px-8 py-3.5 text-base font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-lg shadow-[#d4a843]/20 hover:shadow-[#d4a843]/35"
          >
            Launch Your Marketplace
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/register?role=alumni"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a1a2e]/20 px-8 py-3.5 text-base font-semibold text-[#1a1a2e] hover:border-[#1a1a2e]/40 hover:bg-[#1a1a2e]/5 transition-all duration-200"
          >
            Join as a Partner
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/register?role=student"
            className="inline-flex items-center px-6 py-3.5 text-base font-medium text-[#3a3a3a] hover:text-[#d4a843] transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-[#d4a843]"
          >
            Get Started as a Student
          </a>
        </motion.div>
      </div>
    </section>
  );
}
