'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const comparisonRows = [
  {
    jobBoard: 'List jobs and internships',
    proveground: 'Develop and verify the skills to land them',
  },
  {
    jobBoard: 'Accept applications',
    proveground: 'Build proof that makes applications stand out',
  },
  {
    jobBoard: 'Connect students with recruiters',
    proveground: 'Connect students with real project work',
  },
  {
    jobBoard: 'Track who applied',
    proveground: 'Track skill growth and career readiness',
  },
  {
    jobBoard: 'Show self-reported profiles',
    proveground: 'Show verified project portfolios',
  },
];

export function CareerStack() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 md:py-32 px-6 bg-[#fafaf8]">
      <div ref={ref} className="max-w-4xl mx-auto">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide leading-[1.05] text-center mb-6"
        >
          The layer your career stack is missing.
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[#3a3a3a] text-base md:text-lg leading-relaxed text-center max-w-3xl mx-auto mb-14"
        >
          Your institution already has tools for job listings, career fairs, and application
          tracking. Proveground adds what they can&apos;t provide: verified skill development,
          project-based proof of work, and measurable readiness data. It works alongside
          everything you already use &mdash; making your existing tools more effective, not
          replacing them.
        </motion.p>

        {/* Comparison Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white"
        >
          {/* Header Row */}
          <div className="grid grid-cols-2">
            <div className="bg-[#1a1a2e] px-6 py-4">
              <p className="text-white text-sm font-semibold tracking-wide">
                What Job Boards Do
              </p>
            </div>
            <div className="bg-gradient-to-r from-[#0f766e] to-[#0f766e]/90 px-6 py-4">
              <p className="text-white text-sm font-semibold tracking-wide">
                What Proveground Adds
              </p>
            </div>
          </div>

          {/* Data Rows */}
          {comparisonRows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
              } ${i < comparisonRows.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="px-6 py-4 flex items-center">
                <p className="text-[#3a3a3a]/70 text-sm leading-relaxed">
                  {row.jobBoard}
                </p>
              </div>
              <div className="px-6 py-4 flex items-center border-l border-gray-100">
                <p className="text-[#1a1a2e] text-sm leading-relaxed font-medium">
                  {row.proveground}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Bottom quote */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-[#3a3a3a]/60 text-sm italic text-center mt-8"
        >
          Students apply everywhere. The ones with proof get hired.
        </motion.p>
      </div>
    </section>
  );
}
