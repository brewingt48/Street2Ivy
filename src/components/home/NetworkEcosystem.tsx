'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, Lock, Share2, Users, Building2, GraduationCap, Handshake, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Network node definitions — descriptive archetypes, no real names  */
/* ------------------------------------------------------------------ */

const nodes = [
  { id: 'proveground', label: 'Proveground', x: 50, y: 50, size: 30, type: 'hub' as const },
  { id: 'institution-1', label: 'Your Program', x: 16, y: 28, size: 17, type: 'institution' as const },
  { id: 'corp-partner', label: 'Industry Partner', x: 84, y: 22, size: 17, type: 'corporate' as const },
  { id: 'alumni-network', label: 'Alumni Network', x: 14, y: 72, size: 17, type: 'alumni' as const },
  { id: 'institution-2', label: 'Partner School', x: 82, y: 76, size: 17, type: 'institution' as const },
  { id: 'venture-firm', label: 'Venture Partner', x: 50, y: 12, size: 13, type: 'corporate' as const },
  { id: 'institution-3', label: 'Peer Institution', x: 50, y: 88, size: 13, type: 'institution' as const },
];

const connections = [
  ['proveground', 'institution-1'],
  ['proveground', 'corp-partner'],
  ['proveground', 'alumni-network'],
  ['proveground', 'institution-2'],
  ['proveground', 'venture-firm'],
  ['proveground', 'institution-3'],
  ['institution-1', 'alumni-network'],
  ['corp-partner', 'institution-2'],
  ['institution-1', 'venture-firm'],
  ['institution-2', 'institution-3'],
  ['alumni-network', 'institution-3'],
  ['corp-partner', 'venture-firm'],
];

/* ------------------------------------------------------------------ */
/*  Feature cards for Exclusive & Network posting                     */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Lock,
    title: 'Exclusive Opportunities',
    description:
      'Programs curate their own private talent engine. Listings stay within your institution — visible only to your students, vetted by your team. Quality and trust, by design.',
  },
  {
    icon: Share2,
    title: 'Network Sharing',
    description:
      'Choose to share select opportunities across the Proveground network. Partner institutions see what you publish, and you see theirs — expanding reach while preserving control.',
  },
  {
    icon: Globe,
    title: 'Open Ecosystem',
    description:
      'Corporate partners and alumni post directly into the network. Every institution connected to Proveground gains access — creating a talent pipeline that grows stronger together.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function NetworkEcosystem() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getNode = (id: string) => nodes.find((n) => n.id === id)!;

  /* Node colour by type */
  const nodeColor = (type: string) => {
    switch (type) {
      case 'hub':
        return '#d4a843';
      case 'institution':
        return '#3a7bd5';
      case 'corporate':
        return '#1a1a2e';
      case 'alumni':
        return '#2d8659';
      default:
        return '#1a1a2e';
    }
  };

  const nodeIcon = (type: string) => {
    switch (type) {
      case 'institution':
        return GraduationCap;
      case 'corporate':
        return Building2;
      case 'alumni':
        return Users;
      default:
        return Handshake;
    }
  };

  return (
    <section className="relative py-28 md:py-36 px-6 overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#1e2140] to-[#1a1a2e]">
      {/* Ambient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.35) 0%, transparent 70%)',
        }}
      />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 px-4 py-1.5 mb-6"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse" />
            <span className="text-[#d4a843] text-xs font-semibold uppercase tracking-[0.2em]">
              The Ecosystem
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[1.05] mb-6"
          >
            Stronger{' '}
            <span className="text-[#d4a843]">together.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Proveground connects institutions, alumni networks, and industry partners into one
            unified talent ecosystem. Each program keeps its own private talent engine — while
            sharing select opportunities across the network amplifies reach for everyone.
          </motion.p>
        </div>

        {/* Two-column: Network Viz + Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT — Interactive network visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative mx-auto w-full max-w-md aspect-square"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-4 rounded-full border border-white/[0.04]" />

            <svg viewBox="0 0 100 100" className="w-full h-full" aria-label="Network ecosystem visualization showing institutions, corporate partners, and alumni connected through Proveground">
              {/* Connection lines with subtle pulse */}
              {connections.map(([fromId, toId], i) => {
                const from = getNode(fromId);
                const to = getNode(toId);
                const opacity = 0.12 + 0.08 * Math.sin((pulsePhase + i * 10) * 0.06);
                return (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#d4a843"
                    strokeWidth="0.25"
                    opacity={opacity}
                    strokeDasharray={fromId === 'proveground' ? 'none' : '1 1'}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isHub = node.type === 'hub';
                const pulseScale = isHub ? 1 + 0.06 * Math.sin(pulsePhase * 0.04) : 1;
                const color = nodeColor(node.type);
                return (
                  <g key={node.id}>
                    {/* Ambient glow for hub */}
                    {isHub && (
                      <>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.size * 0.7 * pulseScale}
                          fill="#d4a843"
                          opacity={0.06 + 0.03 * Math.sin(pulsePhase * 0.04)}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.size * 0.45 * pulseScale}
                          fill="#d4a843"
                          opacity={0.1}
                        />
                      </>
                    )}

                    {/* Node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size * 0.2 * pulseScale}
                      fill={color}
                      opacity={isHub ? 1 : 0.85}
                    />

                    {/* Outer ring for non-hub nodes */}
                    {!isHub && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.size * 0.28}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.2"
                        opacity={0.3}
                      />
                    )}

                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + node.size * 0.35}
                      textAnchor="middle"
                      className="fill-white/70"
                      fontSize={isHub ? '3.2' : '2.1'}
                      fontWeight={isHub ? '600' : '400'}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* RIGHT — Feature cards */}
          <div className="space-y-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                  className="group flex gap-4 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-[#d4a843]/20 transition-all duration-500"
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#d4a843]/10 flex items-center justify-center group-hover:bg-[#d4a843]/20 transition-colors duration-300">
                    <Icon className="h-5 w-5 text-[#d4a843]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1.5">{feature.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}

            {/* Inspirational callout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="pt-4 pl-1"
            >
              <p className="text-white/40 text-sm leading-relaxed italic">
                &ldquo;When institutions, alumni, and industry share a common platform, talent
                flows to where it&apos;s needed most — and opportunity reaches those who&apos;ve earned it.&rdquo;
              </p>
            </motion.div>
          </div>
        </div>

        {/* Bottom stat bar — Fortune 500 style credibility strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden"
        >
          {[
            { value: 'Private', label: 'Each talent engine is exclusive to its program' },
            { value: 'Shared', label: 'Select postings extend across partner institutions' },
            { value: 'Verified', label: 'Every engagement and review is authenticated' },
            { value: 'United', label: 'One ecosystem where everyone wins together' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.03] p-6 text-center">
              <p className="font-display text-xl md:text-2xl text-[#d4a843] tracking-wider mb-1">
                {stat.value}
              </p>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.12em] text-white/40 font-medium leading-snug">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Bottom accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 1, ease: 'easeOut' }}
          className="mt-12 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-[#d4a843]/40 to-transparent origin-center"
        />
      </div>
    </section>
  );
}
