'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Why Now', href: '#the-moment' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Who It\'s For', href: '#who-its-for' },
  { label: 'AI Coaching', href: '#ai-coaching' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-0 shrink-0">
            <span
              className={`font-display text-2xl md:text-3xl tracking-wider transition-colors duration-300 ${
                scrolled ? 'text-[#1a1a2e]' : 'text-white'
              }`}
            >
              PROVE
            </span>
            <span className="font-display text-2xl md:text-3xl tracking-wider text-[#d4a843]">
              GROUND
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 hover:text-[#d4a843] whitespace-nowrap ${
                  scrolled ? 'text-[#3a3a3a]' : 'text-white/90'
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-3 ml-2">
              <a
                href="/login"
                className={`text-sm font-medium transition-colors duration-200 hover:text-[#d4a843] whitespace-nowrap ${
                  scrolled ? 'text-[#3a3a3a]' : 'text-white/90'
                }`}
              >
                Sign In
              </a>
              <a
                href="/register"
                className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md shadow-[#d4a843]/20 hover:shadow-lg hover:shadow-[#d4a843]/30 whitespace-nowrap"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-[#1a1a2e]' : 'text-white'
            }`}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-[#1a1a2e] text-base font-medium hover:text-[#d4a843] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <a
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-6 py-3 rounded-full border-2 border-[#1a1a2e]/15 text-[#1a1a2e] font-semibold hover:bg-[#1a1a2e]/5 transition-all"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-6 py-3 rounded-full bg-[#d4a843] text-[#1a1a2e] font-semibold hover:bg-[#f0c75e] transition-all"
                >
                  Get Started
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
