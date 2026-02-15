'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const signalCards = [
  {
    label: 'The Shift',
    body: 'Entry-level work is being automated. The tasks that once trained new grads \u2014 data entry, research summaries, basic analysis \u2014 are now handled by AI.',
  },
  {
    label: 'The Opportunity',
    body: 'Real work builds what AI can\u2019t replace. Judgment, collaboration, leadership under pressure \u2014 sharpened through real internships and projects, not coursework.',
  },
  {
    label: 'The Advantage',
    body: 'First movers set the standard. Programs that give students access to real corporate work through alumni networks will own the future of career readiness.',
  },
  {
    label: 'The Answer',
    body: 'Proveground was built for this moment. A platform where students prove themselves through real internships and project work \u2014 and build verified reputations.',
  },
];

export function TheMoment() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="the-moment" className="py-24 md:py-32 px-6 bg-[#FAFAF7]">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
          {/* Left column — Copy */}
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
              The world just changed.
              <br />
              The smartest programs are changing with it.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-5 text-[#3a3a3a] text-base md:text-lg leading-relaxed"
            >
              <p>
                AI isn&apos;t a threat &mdash; it&apos;s a signal. The tasks that defined entry-level
                work are being automated. The old ladder &mdash; classroom to internship to job offer
                &mdash; is being rebuilt in real time. That&apos;s not a crisis. It&apos;s a
                once-in-a-generation opportunity for students, programs, and companies willing to
                move differently.
              </p>
              <p>
                The question isn&apos;t whether AI will reshape the workforce. It already has. The
                question is: who&apos;s preparing their students for what comes next?
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 text-xl md:text-2xl font-semibold text-[#d4a843] leading-snug"
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
                className="group bg-white rounded-xl p-6 border-l-4 border-[#3a7bd5] shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <h3 className="font-display text-lg tracking-wider text-[#1a1a2e] mb-2">
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
