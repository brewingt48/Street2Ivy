/**
 * CSRF-aware fetch wrapper for client-side mutations.
 *
 * Automatically fetches a CSRF token on the first mutation request,
 * caches it, and includes the `x-csrf-token` header on all
 * non-GET/HEAD/OPTIONS requests.
 *
 * Usage:
 *   import { csrfFetch } from '@/lib/security/csrf-fetch';
 *   const res = await csrfFetch('/api/ai/portfolio-intelligence', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ ... }),
 *   });
 */

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string> {
  // Check cookie first (may already exist from a prior request)
  const existing = getCookieValue('csrf-token');
  if (existing) {
    cachedToken = existing;
    return existing;
  }

  // Return cached token if we have one
  if (cachedToken) return cachedToken;

  // Deduplicate concurrent requests
  if (tokenPromise) return tokenPromise;

  tokenPromise = fetch('/api/csrf-token')
    .then((r) => r.json())
    .then((data) => {
      cachedToken = data.csrfToken;
      tokenPromise = null;
      return data.csrfToken as string;
    })
    .catch((err) => {
      tokenPromise = null;
      throw err;
    });

  return tokenPromise;
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export async function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();

  if (SAFE_METHODS.includes(method)) {
    return fetch(input, init);
  }

  const token = await ensureCsrfToken();

  const headers = new Headers(init?.headers);
  headers.set('x-csrf-token', token);

  return fetch(input, { ...init, headers });
}
