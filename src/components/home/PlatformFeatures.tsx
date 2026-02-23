'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Zap, Target, Award, Sparkles, BarChart3, BookOpen } from 'lucide-react';

const features = [
  {
    icon: Zap,
    color: '#d4a843',
    headline: 'Match Engine\u2122',
    body: 'Our proprietary matching algorithm evaluates skills, availability, academic profile, and engagement history to connect students with the right projects and employers with the right talent.',
  },
  {
    icon: Target,
    color: '#0f766e',
    headline: 'Skills Gap Analyzer',
    body: 'Shows students the specific skills they need for their target career path, powered by real employer demand data. Analyzes the actual job qualifications posted by employers recruiting at your institution.',
  },
  {
    icon: Award,
    color: '#7c3aed',
    headline: 'Verified Portfolio Builder',
    body: 'Every student gets a shareable, authenticated portfolio of completed project work, skill badges, and career readiness indicators. Employers see proof, not promises.',
  },
  {
    icon: Sparkles,
    color: '#d97706',
    headline: 'AI Career Coaching',
    body: 'Personalized career coaching powered by Anthropic\u2019s Claude. Interview prep, resume review, project strategy, and professional development \u2014 context-aware and tied to each student\u2019s profile.',
  },
  {
    icon: BarChart3,
    color: '#2563eb',
    headline: 'Outcomes Dashboard',
    body: 'Real-time reporting on student engagement, skill development, employer satisfaction, and career outcomes. Pre-built templates for accreditation, board reports, and program reviews.',
  },
  {
    icon: BookOpen,
    color: '#059669',
    headline: 'Team Huddle Content Hub',
    body: 'A branded content portal for your institution. Share videos, articles, and resources from mentors, alumni, and industry voices \u2014 curated by your team, delivered in your brand.',
  },
];

export function PlatformFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="platform" className="py-24 md:py-32 px-6 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
          >
            The Platform
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide"
          >
            The complete career readiness platform.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#3a3a3a]/70 mt-4 max-w-2xl mx-auto"
          >
            Smart matching, verified portfolios, AI coaching, and outcome analytics &mdash; all branded as yours.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.headline}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: feature.color }} />
                </div>

                {/* Headline */}
                <h3 className="font-semibold text-lg text-[#1a1a2e] mb-3 leading-snug">
                  {feature.headline}
                </h3>

                {/* Body */}
                <p className="text-sm text-[#3a3a3a]/70 leading-relaxed">
                  {feature.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
