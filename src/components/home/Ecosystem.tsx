'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Zap, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

const DEMO_URL = 'https://calendly.com/proveground/demo';

const pillars = [
  {
    icon: Zap,
    tag: 'Match Engine\u2122',
    title: 'Smart Matching Engine',
    description:
      'Our proprietary Match Engine\u2122 evaluates skills, availability, academic profile, and engagement history to connect students with the right projects \u2014 and connect corporate partners with the right talent. No guesswork. No spray-and-pray.',
    highlights: [
      'Multi-dimensional skill and schedule matching',
      'Real-time talent pool insights for project posters',
      'Verified track records that grow with every engagement',
    ],
    accent: 'from-[#d4a843]/20 to-[#d4a843]/5',
    iconBg: 'bg-[#d4a843]/15',
    iconColor: 'text-[#d4a843]',
  },
  {
    icon: BookOpen,
    tag: 'Team Huddle',
    title: 'Team Huddle Content Hub',
    description:
      'A branded content and learning portal for every institution. Share videos, articles, PDFs, and audio from mentors, alumni, and industry voices \u2014 all curated by your team, delivered in your brand.',
    highlights: [
      'Customizable branded landing page per institution',
      'Video, article, PDF, and audio content support',
      'Topic-based organization with featured content',
    ],
    accent: 'from-teal-500/20 to-teal-500/5',
    iconBg: 'bg-teal-500/15',
    iconColor: 'text-teal-600',
  },
  {
    icon: Sparkles,
    tag: 'AI Coaching',
    title: 'AI Career Coaching',
    description:
      'Personalized career coaching powered by Anthropic\u2019s Claude. From interview prep to project strategy, resume reviews to professional development \u2014 a coach that meets every student where they are.',
    highlights: [
      'Powered by Anthropic\u2019s Claude \u2014 not a generic chatbot',
      'Interview prep, resume review, and career strategy',
      'Context-aware coaching tied to each student\u2019s profile',
    ],
    accent: 'from-violet-500/20 to-violet-500/5',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-600',
  },
];

export function Ecosystem() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 md:py-32 px-6 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
          >
            The Complete Platform
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide leading-[1.05] mb-5"
          >
            More than matching.{' '}
            <span className="text-[#d4a843]">A career ecosystem.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#3a3a3a]/70 text-base md:text-lg leading-relaxed"
          >
            Proveground is more than project matching &mdash; it is a complete career advancement
            ecosystem. Smart matching, branded content delivery, and AI-powered coaching work
            together to prepare students for what&apos;s next.
          </motion.p>
        </div>

        {/* Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.tag}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-500"
              >
                {/* Gradient top accent */}
                <div className={`h-1.5 bg-gradient-to-r ${pillar.accent}`} />

                <div className="p-8">
                  {/* Icon + Tag */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-11 h-11 rounded-xl ${pillar.iconBg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${pillar.iconColor}`} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#3a3a3a]/50">
                      {pillar.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-xl text-[#1a1a2e] tracking-wide mb-3 leading-snug">
                    {pillar.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#3a3a3a]/70 text-sm leading-relaxed mb-5">
                    {pillar.description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-2">
                    {pillar.highlights.map((highlight, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-[#3a3a3a]/60">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pillar.iconBg}`} />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mt-14"
        >
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#2a2a4e] transition-all duration-200 shadow-md group"
          >
            See the Full Platform
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
