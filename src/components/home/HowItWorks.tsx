'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Your Program Launches a Marketplace',
    body: 'Your team, department, or institution gets a fully branded Proveground marketplace \u2014 your colors, your logo, your identity. A home base built around your network.',
  },
  {
    num: '02',
    title: 'Partners Post Internships & Projects',
    body: 'From structured internships to scoped consulting projects \u2014 alumni and corporate partners bring real business challenges to your students. No simulations. No busywork.',
  },
  {
    num: '03',
    title: 'Students Deliver & Get Reviewed',
    body: 'Every internship and project is an opportunity to prove it. Students deliver real results. Partners leave verified reviews. Reputation is built one engagement at a time.',
  },
  {
    num: '04',
    title: 'Reputation Opens Doors',
    body: 'A Proveground profile isn\u2019t a resume \u2014 it\u2019s a track record. Verified internships, completed projects, real reviews. A portfolio that speaks louder than a GPA ever could.',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
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

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
              className="relative"
            >
              {/* Gold top border */}
              <div className="h-1 w-12 bg-[#d4a843] rounded-full mb-6" />

              {/* Faded step number */}
              <p className="font-display text-7xl text-[#d4a843]/15 tracking-wider leading-none mb-4">
                {step.num}
              </p>

              <h3 className="font-semibold text-[#1a1a2e] text-lg mb-3 leading-snug">
                {step.title}
              </h3>
              <p className="text-[#3a3a3a]/80 text-sm leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
