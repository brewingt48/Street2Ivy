'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { GraduationCap, Handshake, Building2 } from 'lucide-react';

const cards = [
  {
    icon: GraduationCap,
    headline: 'Stop waiting. Start proving.',
    body: 'The world is changing \u2014 and that\u2019s your advantage. While others wait for the old system to catch up, you\u2019re already moving. Access real internships and projects from alumni and corporate partners, build a verified track record, and step into your career with proof, not promises.',
    label: 'For Students',
  },
  {
    icon: Handshake,
    headline: 'Invest in the next class. Get real results.',
    body: 'You remember the grind. Now give back in the most meaningful way \u2014 real internships and project work for the students coming up behind you. Find your next hire through a scoped project before making a full commitment. No overhead. No risk. Just hungry, proven talent.',
    label: 'For Alumni & Partners',
  },
  {
    icon: Building2,
    headline: 'The future belongs to programs that move first.',
    body: 'AI is rewriting the rules of career readiness. The programs that thrive won\u2019t be the ones that wait \u2014 they\u2019ll be the ones that give students a new path forward. Launch a fully branded marketplace filled with real internships and projects. Lead the shift.',
    label: 'For Programs',
  },
];

export function ValueProps() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="who-its-for" className="py-24 md:py-32 px-6 bg-[#FAFAF7]">
      <div ref={ref} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
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

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              className="group bg-white rounded-2xl border border-gray-100 p-8 md:p-10 relative overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Gold top border that grows on hover */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4a843] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center mb-6">
                <card.icon className="h-6 w-6 text-[#d4a843]" />
              </div>

              {/* Label */}
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d4a843] mb-3">
                {card.label}
              </p>

              <h3 className="font-display text-2xl md:text-3xl text-[#1a1a2e] tracking-wide mb-4 leading-snug">
                {card.headline}
              </h3>

              <p className="text-[#3a3a3a] text-sm md:text-base leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
