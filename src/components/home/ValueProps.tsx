'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { GraduationCap, Handshake, Building2 } from 'lucide-react';

const cards = [
  {
    icon: GraduationCap,
    headline: 'Stop waiting. Start proving.',
    body: 'Access real internships and projects from alumni and corporate partners. Build a verified track record. Step into your career with proof, not promises.',
    label: 'For Students',
  },
  {
    icon: Handshake,
    headline: 'Invest in the next class.',
    body: 'Post real project work for the students coming up behind you. Find your next hire through a scoped engagement before making a full commitment.',
    label: 'For Alumni & Partners',
  },
  {
    icon: Building2,
    headline: 'Move first. Lead the shift.',
    body: 'Launch a fully branded marketplace filled with real internships and projects. Give your students a new path forward while AI rewrites the rules.',
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
            Three audiences. One proving ground.
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
