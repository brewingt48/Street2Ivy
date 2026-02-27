import { headers } from 'next/headers';
import type { TenantInfo } from './resolve';

/**
 * Get the current tenant from request headers (set by middleware).
 * Use this in Server Components and API routes.
 */
export async function getTenant(): Promise<TenantInfo | null> {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  const subdomain = h.get('x-tenant-subdomain');
  const name = h.get('x-tenant-name');
  const displayName = h.get('x-tenant-display-name');
  const branding = h.get('x-tenant-branding');
  const features = h.get('x-tenant-features');

  if (!tenantId || !subdomain) return null;

  return {
    id: tenantId,
    subdomain,
    name: name || subdomain,
    displayName: displayName || name || subdomain,
    branding: branding ? JSON.parse(branding) : {},
    features: features ? JSON.parse(features) : {},
  };
}

/**
 * Get tenant ID from headers. Returns the default tenant if none found.
 */
export async function getTenantId(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-tenant-id') || process.env.TENANT_ID || ''
  );
}
