'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, CheckCircle2 } from 'lucide-react';

export function StudentBanner() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', schoolName: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.schoolName.trim()) return;
    setSubmitting(true);
    // Log to console for now — backend integration later
    console.log('Notify My School submission:', formData);
    // Simulate short delay
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  const closeAndReset = () => {
    setModalOpen(false);
    // Reset after animation
    setTimeout(() => {
      setFormData({ name: '', email: '', schoolName: '' });
      setSubmitted(false);
    }, 300);
  };

  return (
    <>
      {/* Banner Strip */}
      <section className="bg-[#1a1a2e] py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#d4a843] shrink-0" />
            <p className="text-white/90 text-sm font-medium text-center sm:text-left">
              Student? Ask your school to bring ProveGround to your campus.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#d4a843] text-[#d4a843] text-xs font-semibold hover:bg-[#d4a843] hover:text-[#1a1a2e] transition-all duration-200 whitespace-nowrap"
          >
            Notify My School
          </button>
        </div>
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
                      className="mt-6 px-6 py-2.5 rounded-xl bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#1a1a2e]/90 transition-all"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <>
                    <h2 className="font-display text-2xl text-[#1a1a2e] tracking-wide mb-2">
                      Bring ProveGround to Your Campus
                    </h2>
                    <p className="text-[#3a3a3a]/70 text-sm leading-relaxed mb-6">
                      Tell us your school name and email. We&apos;ll reach out to your administration and let you know when your talent engine is live.
                    </p>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                        autoFocus
                      />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Your email"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                      />
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        placeholder="School name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/40 focus:border-[#d4a843] transition-all"
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !formData.name.trim() || !formData.email.trim() || !formData.schoolName.trim()}
                      className="w-full mt-4 py-3 rounded-xl bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md shadow-[#d4a843]/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
