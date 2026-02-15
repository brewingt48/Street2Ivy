/**
 * Security Headers
 *
 * Configure CSP, HSTS, X-Frame-Options, and other security headers.
 * Applied in next.config.ts via headers() or in middleware.
 */

export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

/**
 * Content Security Policy
 *
 * Allows inline styles/scripts for Next.js SSR while restricting external sources.
 * 'unsafe-eval' removed per NIST/OWASP guidance — defeats XSS protection.
 * 'unsafe-inline' kept for now (Next.js SSR requires it without nonce-based setup).
 */
export const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mailgun.net",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join('; ');
