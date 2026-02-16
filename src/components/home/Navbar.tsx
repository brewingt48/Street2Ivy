'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Who It\'s For', href: '#who-its-for' },
  { label: 'AI Coaching', href: '#ai-coaching' },
];

const DEMO_URL = 'https://calendly.com/proveground/demo';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close login modal on Escape
  useEffect(() => {
    if (!loginOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLoginOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loginOpen]);

  // Prevent body scroll when login modal is open
  useEffect(() => {
    document.body.style.overflow = loginOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [loginOpen]);

  const handleGoToMarketplace = () => {
    if (!tenantSearch.trim()) return;
    // Convert input to a subdomain-style slug and navigate
    const slug = tenantSearch.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    window.location.href = `/${slug}`;
  };

  return (
    <>
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
                <button
                  onClick={() => setLoginOpen(true)}
                  className={`text-sm font-medium transition-colors duration-200 hover:text-[#d4a843] whitespace-nowrap cursor-pointer ${
                    scrolled ? 'text-[#3a3a3a]' : 'text-white/90'
                  }`}
                >
                  Log In
                </button>
                <a
                  href={DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md shadow-[#d4a843]/20 hover:shadow-lg hover:shadow-[#d4a843]/30 whitespace-nowrap"
                >
                  Request a Demo
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
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setLoginOpen(true);
                    }}
                    className="block w-full text-center px-6 py-3 rounded-full border-2 border-[#1a1a2e]/15 text-[#1a1a2e] font-semibold hover:bg-[#1a1a2e]/5 transition-all"
                  >
                    Log In
                  </button>
                  <a
                    href={DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center px-6 py-3 rounded-full bg-[#d4a843] text-[#1a1a2e] font-semibold hover:bg-[#f0c75e] transition-all"
                  >
                    Request a Demo
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Login Modal */}
      <AnimatePresence>
        {loginOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={() => setLoginOpen(false)}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-6"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setLoginOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="font-display text-3xl text-[#1a1a2e] tracking-wide mb-2">
                  Welcome back
                </h2>
                <p className="text-[#3a3a3a]/70 text-sm leading-relaxed mb-6">
                  Log in through your school or network&apos;s ProveGround talent engine.
                </p>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGoToMarketplace()}
                    placeholder="Enter your school or organization name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleGoToMarketplace}
                  disabled={!tenantSearch.trim()}
                  className="w-full py-3 rounded-xl bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md shadow-[#d4a843]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Go to My Talent Engine
                </button>

                <p className="text-xs text-gray-400 text-center mt-4">
                  Not sure?{' '}
                  <a href="/contact" className="text-[#d4a843] hover:underline">
                    Contact your program administrator.
                  </a>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
