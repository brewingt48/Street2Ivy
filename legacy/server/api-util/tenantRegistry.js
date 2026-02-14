/**
 * Tenant Registry
 *
 * Manages multi-tenant configuration for Street2Ivy.
 * Each tenant represents an institution with its own Sharetribe marketplace account.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('./db');

/**
 * Build the default tenant from environment variables.
 * This ensures backward compatibility — the system works identically
 * to a single-tenant deployment when no additional tenants are configured.
 */
function buildDefaultTenant() {
  return {
    id: 'default',
    subdomain: null, // matches the bare domain (no subdomain)
    name: process.env.REACT_APP_MARKETPLACE_NAME || 'Campus2Career',
    displayName: process.env.REACT_APP_MARKETPLACE_NAME || 'Campus2Career',
    status: 'active',
    sharetribe: {
      clientId: process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
      clientSecret: process.env.SHARETRIBE_SDK_CLIENT_SECRET,
      integrationClientId:
        process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID ||
        process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
      integrationClientSecret:
        process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET ||
        process.env.SHARETRIBE_SDK_CLIENT_SECRET,
    },
    branding: {
      marketplaceName: process.env.REACT_APP_MARKETPLACE_NAME || 'Campus2Career',
    },
    institutionDomain: null,
    corporatePartnerIds: [],
    features: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load / seed tenants on startup.
 * Ensures the default tenant always exists in the database.
 */
function loadTenants() {
  const allTenants = db.tenants.getAll();

  if (allTenants.length === 0) {
    // No tenants in DB — seed with the default tenant
    const defaultTenant = buildDefaultTenant();
    db.tenants.upsert(defaultTenant);
    console.log('Initialized tenant registry with default tenant');
    return;
  }

  console.log(`Loaded ${allTenants.length} tenants from database`);

  // Ensure default tenant exists
  const hasDefault = allTenants.some(t => t.id === 'default');
  if (!hasDefault) {
    const defaultTenant = buildDefaultTenant();
    db.tenants.upsert(defaultTenant);
  }
}

/**
 * Get a tenant by subdomain. Returns null if not found.
 */
function getTenantBySubdomain(subdomain) {
  if (!subdomain) {
    return db.tenants.getById('default') || null;
  }
  return db.tenants.getBySubdomain(subdomain.toLowerCase()) || null;
}

/**
 * Get a tenant by ID. Returns null if not found.
 */
function getTenantById(id) {
  return db.tenants.getById(id) || null;
}

/**
 * Get the default tenant (the one backed by environment variable credentials).
 */
function getDefaultTenant() {
  return db.tenants.getById('default') || null;
}

/**
 * Get all tenants as an array.
 */
function getAllTenants() {
  return db.tenants.getAll();
}

/**
 * Create a new tenant. Returns the created tenant or throws on validation error.
 */
function createTenant(tenantData) {
  const { subdomain, name, sharetribe } = tenantData;

  // Validate subdomain
  if (!subdomain || typeof subdomain !== 'string') {
    throw new Error('Subdomain is required.');
  }
  const normalizedSubdomain = subdomain.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalizedSubdomain)) {
    throw new Error('Subdomain must be 3-30 characters, lowercase alphanumeric and hyphens only.');
  }
  if (normalizedSubdomain === 'default' || normalizedSubdomain === 'www' || normalizedSubdomain === 'api') {
    throw new Error('This subdomain is reserved.');
  }
  if (db.tenants.getBySubdomain(normalizedSubdomain)) {
    throw new Error('A tenant with this subdomain already exists.');
  }

  // Validate name
  if (!name || typeof name !== 'string') {
    throw new Error('Tenant name is required.');
  }

  // Validate Sharetribe credentials
  if (!sharetribe?.clientId || !sharetribe?.clientSecret) {
    throw new Error('Sharetribe clientId and clientSecret are required.');
  }

  const tenant = {
    id: normalizedSubdomain,
    subdomain: normalizedSubdomain,
    name,
    displayName: tenantData.displayName || `${name} on Campus2Career`,
    status: tenantData.status || 'active',
    sharetribe: {
      clientId: sharetribe.clientId,
      clientSecret: sharetribe.clientSecret,
      integrationClientId: sharetribe.integrationClientId || sharetribe.clientId,
      integrationClientSecret: sharetribe.integrationClientSecret || sharetribe.clientSecret,
    },
    branding: tenantData.branding || {
      marketplaceName: `${name} on Campus2Career`,
    },
    institutionDomain: tenantData.institutionDomain || null,
    corporatePartnerIds: tenantData.corporatePartnerIds || [],
    features: tenantData.features || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.tenants.upsert(tenant);

  return tenant;
}

/**
 * Update an existing tenant. Returns the updated tenant or throws on error.
 */
function updateTenant(id, updates) {
  const tenant = getTenantById(id);
  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  // Prevent changing the default tenant's ID or subdomain
  if (id === 'default' && updates.subdomain) {
    throw new Error('Cannot change the subdomain of the default tenant.');
  }

  // Apply updates (shallow merge for top-level, deep merge for nested objects)
  if (updates.name !== undefined) tenant.name = updates.name;
  if (updates.displayName !== undefined) tenant.displayName = updates.displayName;
  if (updates.status !== undefined) tenant.status = updates.status;
  if (updates.institutionDomain !== undefined) tenant.institutionDomain = updates.institutionDomain;
  if (updates.corporatePartnerIds !== undefined) tenant.corporatePartnerIds = updates.corporatePartnerIds;

  if (updates.sharetribe) {
    tenant.sharetribe = { ...tenant.sharetribe, ...updates.sharetribe };
  }
  if (updates.branding) {
    tenant.branding = { ...tenant.branding, ...updates.branding };
  }
  if (updates.features) {
    tenant.features = { ...tenant.features, ...updates.features };
  }

  tenant.updatedAt = new Date().toISOString();
  db.tenants.upsert(tenant);

  return tenant;
}

/**
 * Delete a tenant. Cannot delete the default tenant.
 */
function deleteTenant(id) {
  if (id === 'default') {
    throw new Error('Cannot delete the default tenant.');
  }

  const tenant = getTenantById(id);
  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  db.tenants.delete(id);

  return true;
}

/**
 * saveTenants is a no-op for backward compatibility.
 * The SQLite layer auto-persists.
 */
function saveTenants() {
  // No-op — SQLite writes are synchronous and immediate
  return true;
}

// Load tenants on startup
loadTenants();

module.exports = {
  getTenantBySubdomain,
  getTenantById,
  getDefaultTenant,
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  loadTenants,
  saveTenants,
};
