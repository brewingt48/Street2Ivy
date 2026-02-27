/**
 * Subdomain Detection Utility (L-21)
 *
 * Consolidates all subdomain extraction logic into a single shared function.
 * Every server-side module that needs to know the subdomain for a given
 * HTTP request should import `getSubdomain` from this file instead of
 * rolling its own hostname-parsing code.
 *
 * Resolution rules:
 * 1. Extract hostname from `req.hostname` (Express) or the `Host` header.
 * 2. Strip the port number if present.
 * 3. Return null for localhost / loopback / IP-only hosts.
 * 4. If the hostname ends with the configured TENANT_BASE_DOMAIN, return
 *    the leading label(s) before that base domain (ignoring "www").
 * 5. For any other hostname shape (e.g. a custom domain), fall back to
 *    the first dot-separated label and return it — unless there is only
 *    one label (bare domain or single-word host), in which case return null.
 */

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'street2ivy.com';

/**
 * Hostnames that should never be treated as carrying a meaningful subdomain.
 * Matching is performed after lowercasing and stripping the port.
 */
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

/**
 * Platform hosting domains where the app name is NOT a tenant subdomain.
 * e.g. "street2ivy-dev-c54ffcb26038.herokuapp.com" — the first label is
 * the Heroku app name, not a tenant identifier.
 */
const PLATFORM_DOMAINS = [
  'herokuapp.com',
  'herokussl.com',
  'vercel.app',
  'netlify.app',
  'onrender.com',
];

/**
 * Extract the subdomain from an Express request object.
 *
 * @param {import('express').Request} req  Express request
 * @returns {string|null}  Lowercased subdomain string, or null when there
 *                         is no meaningful subdomain (bare domain, www,
 *                         localhost, etc.)
 */
function getSubdomain(req) {
  // Prefer Express-provided hostname; fall back to Host header.
  const raw = req.hostname || (req.headers && req.headers.host) || '';

  // Strip port number (e.g. "example.com:3000" -> "example.com")
  const host = raw.split(':')[0].toLowerCase();

  if (!host) {
    return null;
  }

  // Local / loopback addresses never carry a subdomain
  if (LOCAL_HOSTS.has(host)) {
    return null;
  }

  // If the host is a raw IPv4 or IPv6 address, skip subdomain detection
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
    return null;
  }

  // --- Standard path: hostname is under our base domain ---
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1)); // strip ".base.domain"

    if (!subdomain || subdomain === 'www') {
      return null;
    }

    return subdomain;
  }

  // Exact match on the base domain itself (no subdomain)
  if (host === BASE_DOMAIN) {
    return null;
  }

  // --- Platform hosting domains (Heroku, Vercel, etc.) ---
  // The app name is NOT a tenant subdomain on these platforms.
  for (const platformDomain of PLATFORM_DOMAINS) {
    if (host.endsWith(`.${platformDomain}`)) {
      return null;
    }
  }

  // --- Fallback: hostname is NOT under the base domain ---
  // For custom domains or unexpected hosts, treat the first label as the
  // subdomain only when there are at least three labels (e.g. "foo.custom.com").
  const parts = host.split('.');
  if (parts.length >= 3) {
    const candidate = parts[0];
    if (candidate === 'www') {
      return null;
    }
    return candidate;
  }

  // Two labels or fewer (e.g. "custom.com", "localhost") — no subdomain.
  return null;
}

module.exports = { getSubdomain };
