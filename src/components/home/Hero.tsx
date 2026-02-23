'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, GraduationCap, CheckCircle2 } from 'lucide-react';

const DEMO_URL = 'https://calendly.com/proveground/demo';

export function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', schoolName: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAndReset();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.schoolName.trim()) return;
    setSubmitting(true);
    console.log('Notify My School submission:', formData);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  const closeAndReset = () => {
    setModalOpen(false);
    setTimeout(() => {
      setFormData({ name: '', email: '', schoolName: '' });
      setSubmitted(false);
    }, 300);
  };

  return (
    <>
      <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#0f2b3d] to-[#0a2a23]" />

        {/* Subtle radial gold glow */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 45%, #d4a843 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide uppercase"
          >
            Where Talent Is
            <br />
            <span className="text-[#d4a843]">Proven,</span> Not Presumed
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed"
          >
            Proveground is the career platform where students prove their skills
            through real project work &mdash; building verified track records that
            employers trust and career offices can measure.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.85 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href="#how-it-works"
              onClick={scrollToHowItWorks}
              className="inline-flex items-center justify-center rounded-full bg-[#d4a843] px-7 py-3 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f0c75e] transition-all duration-200 shadow-lg shadow-[#d4a843]/25"
            >
              See How It Works
            </a>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all duration-200"
            >
              Request a Demo
            </a>
          </motion.div>

          {/* Notify My School prompt */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.05 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2"
          >
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[#d4a843] shrink-0" />
              <span className="text-white/60 text-sm">
                Student? Ask your school to bring Proveground to your campus.
              </span>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#d4a843]/60 text-[#d4a843] text-xs font-semibold hover:bg-[#d4a843] hover:text-[#1a1a2e] transition-all duration-200 whitespace-nowrap"
            >
              Notify My School
            </button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 1 } : {}}
          transition={{ delay: 1.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a
            href="#how-it-works"
            onClick={scrollToHowItWorks}
            aria-label="Scroll to learn more"
          >
            <ChevronDown className="h-5 w-5 text-white/40 animate-bounce" />
          </a>
        </motion.div>
      </section>

      {/* Notify My School Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={closeAndReset}
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
                  onClick={closeAndReset}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                {submitted ? (
                  /* Success State */
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-7 w-7 text-green-500" />
                    </div>
                    <h2 className="font-display text-2xl text-[#1a1a2e] tracking-wide mb-2">
                      Thanks!
                    </h2>
                    <p className="text-[#3a3a3a]/70 text-sm leading-relaxed">
                      We&apos;ll be in touch when your school&apos;s talent engine is ready.
                    </p>
                    <button
                      onClick={closeAndReset}
                      className="mt-6 px-6 py-2.5 rounded-full bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#1a1a2e]/90 transition-all"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <>
                    <h2 className="font-display text-2xl text-[#1a1a2e] tracking-wide mb-2">
                      Bring Proveground to Your Campus
                    </h2>
                    <p className="text-[#3a3a3a]/70 text-sm leading-relaxed mb-6">
                      Tell us your school name and email. We&apos;ll reach out to your
                      administration and let you know when your talent engine is live.
                    </p>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                        autoFocus
                      />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Your email"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                      />
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) =>
                          setFormData({ ...formData, schoolName: e.target.value })
                        }
                        placeholder="School name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={
                        submitting ||
                        !formData.name.trim() ||
                        !formData.email.trim() ||
                        !formData.schoolName.trim()
                      }
                      className="w-full mt-4 py-3 rounded-full bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md shadow-[#d4a843]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
