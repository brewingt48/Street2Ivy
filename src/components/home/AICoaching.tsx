'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const chatMessages = [
  {
    type: 'user' as const,
    text: 'I have a consulting project presentation next week and I\u2019ve never presented to a C-suite audience before.',
  },
  {
    type: 'coach' as const,
    text: 'Let\u2019s get you ready. C-suite audiences care about three things: bottom-line impact, risk profile, and timeline. Let\u2019s restructure your deck around those pillars.',
  },
  {
    type: 'user' as const,
    text: 'Can we start with the opening?',
  },
];

export function AICoaching() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setShowTyping(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  return (
    <section id="ai-coaching" className="py-24 md:py-32 px-6 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left column */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-[#d4a843] text-sm font-semibold uppercase tracking-[0.2em]">
                AI-Powered
              </span>
              <span className="text-[#3a3a3a]/40 text-xs">|</span>
              <span className="text-[#3a3a3a]/50 text-xs font-medium tracking-wide">
                Powered by Anthropic
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl text-[#1a1a2e] tracking-wide leading-[1.05] mb-5"
            >
              AI should prepare you for the future, not replace you.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#3a3a3a] text-base leading-relaxed"
            >
              Personalized career coaching powered by Anthropic&apos;s Claude &mdash; from interview
              prep to project strategy. Not a chatbot. A coach that meets you where you are.
            </motion.p>
          </div>

          {/* Right column — Chat mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-[#FAFAF7] rounded-2xl border border-gray-200 p-6 shadow-sm"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#d4a843]/15 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#d4a843]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e]">Proveground Coach</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Online
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-[#3a3a3a]/40 font-medium tracking-wide uppercase">
                Powered by Anthropic
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.25 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-[#d4a843]/15 text-[#1a1a2e] rounded-br-md'
                        : 'bg-white text-[#3a3a3a] border border-gray-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {showTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
