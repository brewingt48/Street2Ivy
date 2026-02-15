'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const signalCards = [
  {
    label: 'The Shift',
    body: 'Entry-level work is being automated. The tasks that once trained new grads are now handled by AI.',
  },
  {
    label: 'The Opportunity',
    body: 'Real work builds what AI can\u2019t replace \u2014 judgment, collaboration, and leadership under pressure.',
  },
  {
    label: 'The Advantage',
    body: 'Programs that connect students to real corporate work through alumni networks will define what comes next.',
  },
  {
    label: 'The Answer',
    body: 'Proveground is where students prove themselves through real work and build verified reputations.',
  },
];

export function TheMoment() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="the-moment" className="py-24 md:py-32 px-6 bg-[#FAFAF7]">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
          {/* Left column */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="text-[#3a7bd5] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
            >
              The Moment
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide leading-[1.05] mb-8"
            >
              The world just changed. The smartest are changing with it.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#3a3a3a] text-base md:text-lg leading-relaxed mb-8"
            >
              AI isn&apos;t a threat &mdash; it&apos;s a signal. The old career ladder is being
              rebuilt in real time. That&apos;s not a crisis. It&apos;s an opportunity for
              students, programs, and companies willing to move differently.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl font-semibold text-[#d4a843] leading-snug"
            >
              The programs that adapt first don&apos;t just survive the shift. They define it.
            </motion.p>
          </div>

          {/* Right column — Signal Cards */}
          <div className="space-y-4">
            {signalCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                className="group bg-white rounded-xl p-5 border-l-4 border-[#3a7bd5] shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <h3 className="font-display text-lg tracking-wider text-[#1a1a2e] mb-1.5">
                  {card.label}
                </h3>
                <p className="text-[#3a3a3a] text-sm leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
