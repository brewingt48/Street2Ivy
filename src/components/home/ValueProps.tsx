'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { GraduationCap, Briefcase, BarChart3 } from 'lucide-react';

const cards = [
  {
    icon: GraduationCap,
    label: 'For Students',
    headline: 'Prove what you can do',
    body: 'Build a verified portfolio through real project work with real companies.',
  },
  {
    icon: Briefcase,
    label: 'For Employers & Alumni',
    headline: 'Find talent that\u2019s already proven',
    body: 'Post projects and discover students through verified work, not guesswork.',
  },
  {
    icon: BarChart3,
    label: 'For Career Services',
    headline: 'Measure what matters',
    body: 'Launch a branded talent engine with outcomes data your stakeholders need.',
  },
];

export function ValueProps() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="who-its-for" className="py-24 md:py-32 px-6 bg-[#fafaf8]">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
                className="group bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-shadow duration-300"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-[#d4a843]/10 flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-[#d4a843]" />
                </div>

                {/* Label */}
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d4a843] mb-2">
                  {card.label}
                </p>

                {/* Headline */}
                <h3 className="font-semibold text-xl text-[#1a1a2e] mb-3 leading-snug">
                  {card.headline}
                </h3>

                {/* Body */}
                <p className="text-sm text-[#3a3a3a]/70 leading-relaxed">
                  {card.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
