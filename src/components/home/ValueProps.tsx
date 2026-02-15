'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { GraduationCap, Handshake, Building2 } from 'lucide-react';

const cards = [
  {
    icon: GraduationCap,
    headline: 'Your work speaks for itself.',
    body: 'Access real projects from alumni and industry leaders. Our Match Engine\u2122 pairs you with opportunities that fit your skills, schedule, and growth trajectory \u2014 so every engagement builds toward the career you want.',
    label: 'For Students',
  },
  {
    icon: Handshake,
    headline: 'Shape the talent pipeline.',
    body: 'Post meaningful projects and let the Match Engine\u2122 surface the right students for the work. Discover top talent through verified engagement \u2014 not guesswork \u2014 and build lasting relationships that benefit everyone.',
    label: 'For Alumni & Partners',
  },
  {
    icon: Building2,
    headline: 'Lead with vision.',
    body: 'Launch a fully branded talent marketplace powered by proprietary matching. The Match Engine\u2122 connects your students to the right opportunities across the entire Proveground network \u2014 schedule-aware, skill-matched, and data-driven.',
    label: 'For Programs',
  },
];

export function ValueProps() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="who-its-for" className="py-24 md:py-32 px-6 bg-[#FAFAF7]">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
          >
            Who It&apos;s For
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide"
          >
            Three paths. One destination.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              className="group bg-white rounded-2xl border border-gray-100 p-8 relative overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4a843] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />

              <div className="w-11 h-11 rounded-xl bg-[#d4a843]/10 flex items-center justify-center mb-5">
                <card.icon className="h-5 w-5 text-[#d4a843]" />
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d4a843] mb-2">
                {card.label}
              </p>

              <h3 className="font-display text-2xl text-[#1a1a2e] tracking-wide mb-3 leading-snug">
                {card.headline}
              </h3>

              <p className="text-[#3a3a3a]/80 text-sm leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
