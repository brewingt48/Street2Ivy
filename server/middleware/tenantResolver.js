/**
 * Tenant Resolver Middleware
 *
 * Parses the subdomain from each request to determine which tenant
 * (institution marketplace) should handle the request.
 *
 * Resolution order:
 * 1. Subdomain from hostname (e.g., harvard.street2ivy.com -> "harvard")
 * 2. Dev mode fallback: X-Tenant-ID header or ?tenant= query param
 * 3. Default tenant (bare domain or www)
 *
 * Attaches req.tenant with the full tenant configuration.
 */

const {
  getTenantBySubdomain,
  getDefaultTenant,
} = require('../api-util/tenantRegistry');

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'street2ivy.com';
const dev = process.env.REACT_APP_ENV === 'development';

/**
 * Extract subdomain from hostname.
 * Returns null if the request is for the bare domain or www.
 */
function extractSubdomain(hostname) {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check if hostname ends with the base domain
  if (!host.endsWith(BASE_DOMAIN)) {
    return null;
  }

  // If hostname IS the base domain, no subdomain
  if (host === BASE_DOMAIN) {
    return null;
  }

  // Extract the subdomain portion
  const subdomain = host.replace(`.${BASE_DOMAIN}`, '');

  // Ignore www
  if (subdomain === 'www') {
    return null;
  }

  return subdomain.toLowerCase();
}

/**
 * Express middleware that resolves the tenant for each request.
 */
function tenantResolver(req, res, next) {
  let subdomain = extractSubdomain(req.hostname);

  // Dev mode fallback: allow tenant selection via header or query param
  if (!subdomain && dev) {
    subdomain = req.headers['x-tenant-id'] || req.query.tenant || null;
  }

  let tenant;

  if (subdomain) {
    tenant = getTenantBySubdomain(subdomain);

    if (!tenant) {
      return res.status(404).json({
        error: 'Marketplace not found.',
        message: `No marketplace is configured for "${subdomain}".`,
      });
    }

    if (tenant.status !== 'active') {
      return res.status(503).json({
        error: 'Marketplace unavailable.',
        message: 'This marketplace is currently unavailable. Please try again later.',
      });
    }
  } else {
    // No subdomain — use the default tenant
    tenant = getDefaultTenant();
  }

  req.tenant = tenant;
  next();
}

module.exports = { tenantResolver, extractSubdomain };
