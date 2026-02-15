'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Launch Your Marketplace',
    body: 'Your program gets a fully branded marketplace \u2014 your colors, your logo, your identity.',
  },
  {
    num: '02',
    title: 'Partners Post Real Work',
    body: 'Alumni and corporate partners bring real internships and scoped projects. No simulations.',
  },
  {
    num: '03',
    title: 'Students Deliver & Earn Reviews',
    body: 'Real results. Verified reviews. Reputation built one engagement at a time.',
  },
  {
    num: '04',
    title: 'Reputation Opens Doors',
    body: 'A track record that speaks louder than a GPA. Verified work that proves what you can do.',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
          >
            The Playbook
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide"
          >
            Four steps. Real work. Earned reputation.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
              className="relative"
            >
              <div className="h-1 w-10 bg-[#d4a843] rounded-full mb-5" />

              <p className="font-display text-6xl text-[#d4a843]/12 tracking-wider leading-none mb-3">
                {step.num}
              </p>

              <h3 className="font-semibold text-[#1a1a2e] text-base mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-[#3a3a3a]/70 text-sm leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
