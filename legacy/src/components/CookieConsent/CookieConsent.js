import React, { useState, useEffect } from 'react';
import css from './CookieConsent.module.css';

const COOKIE_CONSENT_KEY = 'c2c_cookie_consent';

/**
 * CookieConsent banner component.
 * Displays a GDPR/CCPA-compliant cookie consent banner that gates
 * analytics and marketing cookies until the user gives consent.
 *
 * Usage: Place in the top-level App or Layout component.
 * Check consent status via CookieConsent.hasConsent() before
 * initializing GA4, Stripe analytics, or other cookie-setting services.
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show in browser, and only if consent hasn't been given yet
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Small delay to avoid layout shift on initial render
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
    // Dispatch a custom event so analytics scripts can initialize
    window.dispatchEvent(new CustomEvent('cookieConsentGranted'));
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={css.banner} role="dialog" aria-label="Cookie consent">
      <div className={css.content}>
        <p className={css.text}>
          We use cookies to improve your experience, analyze site traffic, and for marketing purposes.
          By clicking "Accept", you consent to our use of cookies.
          See our{' '}
          <a href="/privacy-policy" className={css.link}>
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/legal/cookie-policy" className={css.link}>
            Cookie Policy
          </a>{' '}
          for details.
        </p>
        <div className={css.buttons}>
          <button className={css.declineButton} onClick={handleDecline} type="button">
            Decline
          </button>
          <button className={css.acceptButton} onClick={handleAccept} type="button">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Check if the user has given cookie consent.
 * Use this before initializing analytics or marketing scripts.
 */
CookieConsent.hasConsent = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
};

export default CookieConsent;
