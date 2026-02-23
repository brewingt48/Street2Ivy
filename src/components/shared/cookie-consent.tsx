'use client';

/**
 * Cookie Consent Banner
 *
 * GDPR-compliant (opt-in required) and CCPA-compliant (opt-out mechanism) banner.
 * Slides up from the bottom on first visit. Stores consent state via the
 * cookie consent utility in `@/lib/cookies/consent`.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { hasConsented, setConsentState } from '@/lib/cookies/consent';

type View = 'banner' | 'preferences';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>('banner');
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a consent choice yet
    if (!hasConsented()) {
      // Small delay so it animates in instead of appearing instantly
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    setConsentState({ analytics: true, marketing: true });
    setVisible(false);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    setConsentState({ analytics: false, marketing: false });
    setVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    setConsentState({ analytics, marketing });
    setVisible(false);
  }, [analytics, marketing]);

  // Don't render anything server-side or if consent already given
  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-500 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700/50 p-6">
          {view === 'banner' && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">We value your privacy</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  We use cookies to improve your experience, analyze site traffic, and personalize content.
                  Essential cookies are required for the site to function. You can choose which optional
                  cookies to accept.{' '}
                  <Link
                    href="/legal/privacy"
                    className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
                  >
                    Read our Privacy Policy
                  </Link>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectNonEssential}
                  className="flex-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Reject Non-Essential
                </button>
                <button
                  onClick={() => setView('preferences')}
                  className="flex-1 rounded-lg border border-slate-600 hover:bg-slate-800 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Manage Preferences
                </button>
              </div>
            </>
          )}

          {view === 'preferences' && (
            <>
              <div className="mb-5">
                <h3 className="text-lg font-semibold mb-1">Cookie Preferences</h3>
                <p className="text-sm text-slate-400">
                  Choose which categories of cookies you allow. Essential cookies cannot be disabled.
                </p>
              </div>

              <div className="space-y-4 mb-5">
                {/* Essential — always on */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60">
                  <div>
                    <p className="text-sm font-medium">Essential Cookies</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Required for login, security, and core functionality. Cannot be disabled.
                    </p>
                  </div>
                  <div className="shrink-0 ml-4">
                    <div className="w-11 h-6 bg-teal-600 rounded-full relative cursor-not-allowed opacity-60">
                      <div className="absolute top-[2px] right-[2px] h-5 w-5 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60">
                  <div>
                    <p className="text-sm font-medium">Analytics Cookies</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Help us understand how visitors interact with the site so we can improve it.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                  </label>
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60">
                  <div>
                    <p className="text-sm font-medium">Marketing Cookies</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Used to deliver relevant ads and track campaign performance across sites.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setView('banner')}
                  className="flex-1 rounded-lg border border-slate-600 hover:bg-slate-800 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
