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
const { getSubdomain } = require('../api-util/subdomainUtils');

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'street2ivy.com';
const dev = process.env.REACT_APP_ENV === 'development';

/**
 * Express middleware that resolves the tenant for each request.
 */
function tenantResolver(req, res, next) {
  let subdomain = getSubdomain(req);

  // Dev mode fallback: allow tenant selection via header or query param
  if (!subdomain && dev) {
    subdomain = req.headers['x-tenant-id'] || req.query.tenant || null;
  }

  let tenant;

  if (subdomain) {
    tenant = getTenantBySubdomain(subdomain);

    if (!tenant) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>Not Found - Campus2Career</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7fafc;color:#2d3748}
        .container{text-align:center;max-width:480px;padding:2rem}h1{font-size:1.5rem;margin-bottom:1rem}p{color:#718096;line-height:1.6}
        a{color:#2c5282;text-decoration:none}a:hover{text-decoration:underline}</style></head>
        <body><div class="container">
        <h1>Page Not Found</h1>
        <p>The institution portal &ldquo;${subdomain}&rdquo; is not registered on Campus2Career.</p>
        <p><a href="https://${BASE_DOMAIN}">Go to Campus2Career</a></p>
        </div></body></html>
      `);
    }

    if (tenant.status !== 'active') {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>Temporarily Unavailable - Campus2Career</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7fafc;color:#2d3748}
        .container{text-align:center;max-width:480px;padding:2rem}h1{font-size:1.5rem;margin-bottom:1rem}p{color:#718096;line-height:1.6}
        a{color:#2c5282;text-decoration:none}a:hover{text-decoration:underline}</style></head>
        <body><div class="container">
        <h1>Temporarily Unavailable</h1>
        <p>This institution portal is currently undergoing maintenance. Please check back shortly.</p>
        <p><a href="https://${BASE_DOMAIN}">Go to Campus2Career</a></p>
        </div></body></html>
      `);
    }
  } else {
    // No subdomain — use the default tenant
    tenant = getDefaultTenant();
  }

  req.tenant = tenant;
  next();
}

module.exports = { tenantResolver, getSubdomain };
