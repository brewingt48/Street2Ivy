/**
 * Cookie Consent Utilities
 *
 * Manages cookie consent state for GDPR (opt-in) and CCPA (opt-out) compliance.
 * Consent is stored as a JSON-encoded cookie named `cookie-consent`.
 *
 * Cookie categories:
 *   - essential: Always on (session, CSRF, auth). Cannot be disabled.
 *   - analytics: Usage tracking, performance monitoring.
 *   - marketing: Third-party ads, retargeting pixels.
 */

export interface ConsentCategories {
  essential: true; // Always on — not configurable
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentState {
  categories: ConsentCategories;
  consentedAt: string; // ISO timestamp
  version: number; // bump when categories change to re-prompt
}

const COOKIE_NAME = 'cookie-consent';
const CONSENT_VERSION = 1;
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * Read the consent state from the cookie-consent cookie.
 * Returns null if the user has not yet consented.
 */
export function getConsentState(): ConsentState | null {
  if (typeof document === 'undefined') return null;

  const raw = getCookieValue(COOKIE_NAME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ConsentState;

    // If the stored version is outdated, treat as no consent
    if (parsed.version !== CONSENT_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check whether the user has given any consent decision.
 */
export function hasConsented(): boolean {
  return getConsentState() !== null;
}

/**
 * Write consent state to the cookie-consent cookie.
 */
export function setConsentState(categories: Omit<ConsentCategories, 'essential'>): void {
  const state: ConsentState = {
    categories: {
      essential: true,
      analytics: categories.analytics,
      marketing: categories.marketing,
    },
    consentedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  const value = encodeURIComponent(JSON.stringify(state));
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Check if a specific cookie category has consent.
 */
export function hasCategoryConsent(category: keyof ConsentCategories): boolean {
  if (category === 'essential') return true;
  const state = getConsentState();
  if (!state) return false;
  return state.categories[category] === true;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}
