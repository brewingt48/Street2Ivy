/**
 * Tenant Registry
 *
 * Manages multi-tenant configuration for Street2Ivy.
 * Each tenant represents an institution with its own Sharetribe marketplace account.
 *
 * Follows the same file-based persistence pattern as server/api/admin/institutions.js.
 */

const fs = require('fs');
const path = require('path');

const TENANTS_FILE = path.join(__dirname, '../data/tenants.json');

// In-memory store keyed by subdomain
let tenants = new Map();

/**
 * Build the default tenant from environment variables.
 * This ensures backward compatibility — the system works identically
 * to a single-tenant deployment when no additional tenants are configured.
 */
function buildDefaultTenant() {
  return {
    id: 'default',
    subdomain: null, // matches the bare domain (no subdomain)
    name: process.env.REACT_APP_MARKETPLACE_NAME || 'Street2Ivy',
    displayName: process.env.REACT_APP_MARKETPLACE_NAME || 'Street2Ivy',
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
      marketplaceName: process.env.REACT_APP_MARKETPLACE_NAME || 'Street2Ivy',
    },
    institutionDomain: null,
    corporatePartnerIds: [],
    features: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load tenants from file. If file does not exist, initializes with the default tenant.
 */
function loadTenants() {
  try {
    if (fs.existsSync(TENANTS_FILE)) {
      const data = fs.readFileSync(TENANTS_FILE, 'utf8');
      const tenantList = JSON.parse(data);
      tenants.clear();
      tenantList.forEach(t => {
        const key = t.subdomain || 'default';
        tenants.set(key, t);
      });
      console.log(`Loaded ${tenantList.length} tenants from file`);

      // Ensure the default tenant always exists
      if (!tenants.has('default')) {
        const defaultTenant = buildDefaultTenant();
        tenants.set('default', defaultTenant);
        saveTenants();
      }
      return;
    }
  } catch (error) {
    console.error('Error loading tenants:', error);
  }

  // No file found — initialize with default tenant
  const defaultTenant = buildDefaultTenant();
  tenants.set('default', defaultTenant);
  saveTenants();
  console.log('Initialized tenant registry with default tenant');
}

/**
 * Save tenants to file.
 */
function saveTenants() {
  try {
    const dataDir = path.dirname(TENANTS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tenantList = Array.from(tenants.values());
    fs.writeFileSync(TENANTS_FILE, JSON.stringify(tenantList, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving tenants:', error);
    return false;
  }
}

/**
 * Get a tenant by subdomain. Returns null if not found.
 */
function getTenantBySubdomain(subdomain) {
  if (!subdomain) {
    return tenants.get('default') || null;
  }
  return tenants.get(subdomain.toLowerCase()) || null;
}

/**
 * Get a tenant by ID. Returns null if not found.
 */
function getTenantById(id) {
  for (const tenant of tenants.values()) {
    if (tenant.id === id) {
      return tenant;
    }
  }
  return null;
}

/**
 * Get the default tenant (the one backed by environment variable credentials).
 */
function getDefaultTenant() {
  return tenants.get('default') || null;
}

/**
 * Get all tenants as an array.
 */
function getAllTenants() {
  return Array.from(tenants.values());
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
  if (tenants.has(normalizedSubdomain)) {
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
    displayName: tenantData.displayName || `Street2Ivy at ${name}`,
    status: tenantData.status || 'active',
    sharetribe: {
      clientId: sharetribe.clientId,
      clientSecret: sharetribe.clientSecret,
      integrationClientId: sharetribe.integrationClientId || sharetribe.clientId,
      integrationClientSecret: sharetribe.integrationClientSecret || sharetribe.clientSecret,
    },
    branding: tenantData.branding || {
      marketplaceName: `Street2Ivy at ${name}`,
    },
    institutionDomain: tenantData.institutionDomain || null,
    corporatePartnerIds: tenantData.corporatePartnerIds || [],
    features: tenantData.features || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tenants.set(normalizedSubdomain, tenant);
  saveTenants();

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
  saveTenants();

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

  const key = tenant.subdomain || 'default';
  tenants.delete(key);
  saveTenants();

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
