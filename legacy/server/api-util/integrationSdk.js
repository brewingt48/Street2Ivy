const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

// Integration API can use its own credentials, or fall back to the Marketplace API ones
const CLIENT_ID =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID ||
  process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const CLIENT_SECRET =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET || process.env.SHARETRIBE_SDK_CLIENT_SECRET;
const BASE_URL = process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL;
const TRANSIT_VERBOSE = process.env.REACT_APP_SHARETRIBE_SDK_TRANSIT_VERBOSE === 'true';

const baseUrlMaybe = BASE_URL ? { baseUrl: BASE_URL } : {};

/**
 * Create an Integration API SDK instance.
 *
 * The Integration API uses CLIENT_ID + CLIENT_SECRET for authentication
 * (no user token needed). It provides access to admin-level endpoints
 * like users.query() which are not available in the Marketplace API.
 */
const getIntegrationSdk = () => {
  if (!CLIENT_SECRET) {
    throw new Error(
      'Integration SDK requires SHARETRIBE_SDK_CLIENT_SECRET to be set. ' +
        'Get it from Sharetribe Console → Build → Applications.'
    );
  }

  return sharetribeIntegrationSdk.createInstance({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    transitVerbose: TRANSIT_VERBOSE,
    ...baseUrlMaybe,
  });
};

/**
 * Cache for tenant-specific Integration SDK instances.
 * Integration SDK does not hold per-user state, so instances can be reused per tenant.
 */
const integrationSdkCache = new Map();

/**
 * Create a tenant-aware Integration API SDK instance.
 * Uses cached instances per tenant to avoid creating new SDK instances on every request.
 * Falls back to env var credentials when tenant is null or has no credentials.
 */
const getIntegrationSdkForTenant = (tenant) => {
  const tenantId = tenant?.id || 'default';

  if (integrationSdkCache.has(tenantId)) {
    return integrationSdkCache.get(tenantId);
  }

  const clientId = tenant?.sharetribe?.integrationClientId
    || tenant?.sharetribe?.clientId
    || CLIENT_ID;
  const clientSecret = tenant?.sharetribe?.integrationClientSecret
    || tenant?.sharetribe?.clientSecret
    || CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error(
      `Integration SDK requires client secret for tenant "${tenantId}". ` +
        'Get it from Sharetribe Console → Build → Applications.'
    );
  }

  const sdk = sharetribeIntegrationSdk.createInstance({
    clientId,
    clientSecret,
    transitVerbose: TRANSIT_VERBOSE,
    ...baseUrlMaybe,
  });

  integrationSdkCache.set(tenantId, sdk);
  return sdk;
};

/**
 * Clear a cached Integration SDK instance (e.g., when tenant credentials are updated).
 */
const clearIntegrationSdkCache = (tenantId) => {
  if (tenantId) {
    integrationSdkCache.delete(tenantId);
  } else {
    integrationSdkCache.clear();
  }
};

module.exports = { getIntegrationSdk, getIntegrationSdkForTenant, clearIntegrationSdkCache };
