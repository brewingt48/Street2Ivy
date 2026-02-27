'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, Briefcase, CheckCircle2, BarChart3 } from 'lucide-react';
import type { HowItWorksCopy } from '@/lib/marketing/types';

const steps = [
  {
    num: '01',
    icon: Rocket,
    title: 'Launch Your Talent Engine',
    body: 'Your institution gets its own branded Proveground platform \u2014 your logo, your domain, your community. We handle onboarding or your team runs it independently.',
  },
  {
    num: '02',
    icon: Briefcase,
    title: 'Employers Post Real Projects',
    body: 'Corporate partners and alumni post scoped, real-world projects. The Match Engine connects them with qualified students based on skills, availability, and fit.',
  },
  {
    num: '03',
    icon: CheckCircle2,
    title: 'Students Deliver and Build Proof',
    body: 'Students complete real work with real deliverables. Every outcome is verified and added to a portable track record they carry beyond graduation.',
  },
  {
    num: '04',
    icon: BarChart3,
    title: 'Everyone Sees the Results',
    body: 'Students build verified portfolios. Employers access proven talent pipelines. Career offices get accreditation-ready outcome data. Everyone wins.',
  },
];

interface HowItWorksProps {
  copy?: HowItWorksCopy;
}

export function HowItWorks({ copy }: HowItWorksProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const displaySteps = steps.map((defaultStep, i) => {
    const override = copy?.steps?.[i];
    return {
      ...defaultStep,
      title: override?.title || defaultStep.title,
      body: override?.description || defaultStep.body,
    };
  });

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-[#fafaf8]">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide"
          >
            {copy?.headline || 'How Proveground Works'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base text-[#3a3a3a]/70 mt-4"
          >
            {copy?.subtitle || 'Four steps from launch to measurable outcomes.'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#d4a843]/20 via-[#d4a843]/40 to-[#d4a843]/20" />

          {displaySteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className="relative text-center lg:text-left"
              >
                {/* Step icon circle */}
                <div className="flex items-center justify-center lg:justify-start mb-5">
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#d4a843] flex items-center justify-center shadow-md shadow-[#d4a843]/20">
                    <Icon className="h-5 w-5 text-[#1a1a2e]" />
                  </div>
                  {/* Mobile/tablet connector dots */}
                  {i < steps.length - 1 && (
                    <div className="hidden sm:flex lg:hidden items-center ml-3 gap-1">
                      <div className="w-1 h-1 rounded-full bg-[#d4a843]/30" />
                      <div className="w-1 h-1 rounded-full bg-[#d4a843]/20" />
                      <div className="w-1 h-1 rounded-full bg-[#d4a843]/10" />
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-[#d4a843] uppercase tracking-widest mb-2">
                  Step {step.num}
                </p>

                <h3 className="font-semibold text-[#1a1a2e] text-base mb-3 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[#3a3a3a]/70 text-sm leading-relaxed">{step.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
