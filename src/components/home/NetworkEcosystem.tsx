'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── Constellation nodes ── */
const nodes = [
  { id: 'proveground', label: 'Proveground', x: 50, y: 50, size: 28, isCenter: true },
  { id: 'team-a', label: 'Team A', x: 18, y: 25, size: 16, isCenter: false },
  { id: 'corp', label: 'Corp Partner', x: 82, y: 20, size: 16, isCenter: false },
  { id: 'alumni', label: 'Alumni Network', x: 15, y: 75, size: 16, isCenter: false },
  { id: 'team-b', label: 'Team B', x: 80, y: 78, size: 16, isCenter: false },
  { id: 'corp-2', label: 'Corp Partner', x: 50, y: 12, size: 12, isCenter: false },
  { id: 'team-c', label: 'Team C', x: 50, y: 88, size: 12, isCenter: false },
];

const connections = [
  ['proveground', 'team-a'],
  ['proveground', 'corp'],
  ['proveground', 'alumni'],
  ['proveground', 'team-b'],
  ['proveground', 'corp-2'],
  ['proveground', 'team-c'],
  ['team-a', 'alumni'],
  ['corp', 'team-b'],
  ['team-a', 'corp-2'],
  ['team-b', 'team-c'],
];

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

  return (
    <section className="py-24 md:py-32 px-6 bg-[#FAFAF7]">
      <div ref={ref} className="max-w-6xl mx-auto text-center">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em] mb-4"
        >
          The Ecosystem
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl text-[#1a1a2e] tracking-wide mb-6"
        >
          One profile. Every opportunity.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#3a3a3a] text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-16"
        >
          When your program joins Proveground, your students don&apos;t just access your alumni
          &mdash; they tap into the entire ecosystem. Corporate partners posting internships and
          projects across institutions. Opportunities you&apos;d never reach alone. A rising tide
          that lifts every program in the network.
        </motion.p>

        {/* Constellation visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mx-auto max-w-xl aspect-square"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-label="Network ecosystem visualization">
            {/* Connection lines */}
            {connections.map(([fromId, toId], i) => {
              const from = getNode(fromId);
              const to = getNode(toId);
              const opacity = 0.15 + 0.1 * Math.sin((pulsePhase + i * 10) * 0.06);
              return (
                <line
                  key={`${fromId}-${toId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#d4a843"
                  strokeWidth="0.3"
                  opacity={opacity}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pulseScale = node.isCenter
                ? 1 + 0.08 * Math.sin(pulsePhase * 0.04)
                : 1;
              return (
                <g key={node.id}>
                  {/* Glow for center */}
                  {node.isCenter && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size * 0.6 * pulseScale}
                      fill="#d4a843"
                      opacity={0.08 + 0.04 * Math.sin(pulsePhase * 0.04)}
                    />
                  )}
                  {/* Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size * 0.18 * pulseScale}
                    fill={node.isCenter ? '#d4a843' : '#1a1a2e'}
                    opacity={node.isCenter ? 1 : 0.7}
                  />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + node.size * 0.3}
                    textAnchor="middle"
                    className="fill-[#3a3a3a]"
                    fontSize={node.isCenter ? '3' : '2.2'}
                    fontWeight={node.isCenter ? '600' : '400'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
