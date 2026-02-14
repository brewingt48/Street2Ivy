/**
 * Tenant Resolution Logic
 *
 * Resolves tenant from subdomain, custom domain, or fallback to default.
 * Used in Edge Middleware and server components.
 */

const PLATFORM_DOMAINS = [
  'localhost',
  'herokuapp.com',
  'street2ivy.com',
  'campus2career.com',
  'vercel.app',
];

/**
 * Extract subdomain from hostname.
 * Returns null if no subdomain or it's a platform domain.
 */
export function extractSubdomain(hostname: string): string | null {
  // Skip IP addresses
  if (/^\d+\.\d+\.\d+\.\d+/.test(hostname)) return null;

  // Remove port
  const host = hostname.split(':')[0];

  // Check if it's a known platform domain (no subdomain)
  for (const domain of PLATFORM_DOMAINS) {
    if (host === domain || host === `www.${domain}`) return null;
  }

  // Extract subdomain
  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Skip www
    if (subdomain === 'www') return null;
    return subdomain;
  }

  return null;
}

/**
 * Tenant info passed via headers from middleware to server components.
 */
export interface TenantInfo {
  id: string;
  subdomain: string;
  name: string;
  displayName: string | null;
  branding: Record<string, unknown>;
  features: Record<string, unknown>;
}
