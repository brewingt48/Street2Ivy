/**
 * Tenant Management API
 *
 * Multi-tenant (white-label) configuration for Street2Ivy.
 * Each tenant represents a school/institution with its own branding.
 *
 * Only system admins can manage tenants.
 */

const path = require('path');
const {
  verifySystemAdmin,
  verifyEducationalAdmin,
  sanitizeString,
  isValidEmail,
  isValidDomain,
} = require('../../api-util/security');
const { readJSON, atomicWriteJSON } = require('../../api-util/jsonStore');

// Tenants data file for persistence
const TENANTS_FILE = path.join(__dirname, '../../data/tenants.json');

// In-memory store for tenants
let tenants = new Map();

// Valid tenant statuses
const VALID_STATUSES = ['active', 'inactive', 'trial', 'onboarding', 'suspended', 'pending-request'];

// Load tenants from file on startup (using jsonStore with .bak fallback)
function loadTenants() {
  try {
    const tenantList = readJSON(TENANTS_FILE, []);
    tenants.clear();
    tenantList.forEach(tenant => {
      tenants.set(tenant.id, tenant);
    });
    console.log(`Loaded ${tenantList.length} tenants from file`);
  } catch (error) {
    console.error('Error loading tenants:', error);
    console.log('Starting with empty tenant list.');
  }
}

// Save tenants to file (atomic write with backup)
async function saveTenants() {
  const tenantList = Array.from(tenants.values());
  const success = await atomicWriteJSON(TENANTS_FILE, tenantList);
  if (!success) {
    console.error('Error saving tenants: atomic write failed');
  }
  return success;
}

// Load tenants on startup
loadTenants();

/**
 * Validate a hex color string
 */
function isValidHexColor(color) {
  if (!color) return true; // null/undefined is fine (means no override)
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validate a URL string
 */
function isValidUrl(url) {
  if (!url) return true; // null/undefined is fine (means no override)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate tenant ID format (lowercase alphanumeric + hyphens)
 */
function isValidTenantId(id) {
  return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(id);
}

/**
 * Validate and sanitize branding object
 */
function validateBranding(branding) {
  if (!branding || typeof branding !== 'object') {
    return { valid: true, branding: {} };
  }

  const errors = [];

  if (branding.marketplaceColor && !isValidHexColor(branding.marketplaceColor)) {
    errors.push('marketplaceColor must be a valid hex color (e.g. #A51C30)');
  }
  if (branding.colorPrimaryButton && !isValidHexColor(branding.colorPrimaryButton)) {
    errors.push('colorPrimaryButton must be a valid hex color');
  }
  if (branding.logoUrl && !isValidUrl(branding.logoUrl)) {
    errors.push('logoUrl must be a valid URL');
  }
  if (branding.faviconUrl && !isValidUrl(branding.faviconUrl)) {
    errors.push('faviconUrl must be a valid URL');
  }
  if (branding.brandImageUrl && !isValidUrl(branding.brandImageUrl)) {
    errors.push('brandImageUrl must be a valid URL');
  }
  if (branding.facebookImageUrl && !isValidUrl(branding.facebookImageUrl)) {
    errors.push('facebookImageUrl must be a valid URL');
  }
  if (branding.twitterImageUrl && !isValidUrl(branding.twitterImageUrl)) {
    errors.push('twitterImageUrl must be a valid URL');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return only known branding fields, sanitized
  return {
    valid: true,
    branding: {
      marketplaceColor: branding.marketplaceColor || null,
      colorPrimaryButton: branding.colorPrimaryButton || null,
      marketplaceName: branding.marketplaceName
        ? sanitizeString(branding.marketplaceName, { maxLength: 100 })
        : null,
      logoUrl: branding.logoUrl || null,
      faviconUrl: branding.faviconUrl || null,
      brandImageUrl: branding.brandImageUrl || null,
      facebookImageUrl: branding.facebookImageUrl || null,
      twitterImageUrl: branding.twitterImageUrl || null,
    },
  };
}

/**
 * Validate and sanitize features object
 */
function validateFeatures(features) {
  if (!features || typeof features !== 'object') {
    return { aiCoaching: false, nda: false, assessments: false };
  }
  return {
    aiCoaching: Boolean(features.aiCoaching),
    nda: Boolean(features.nda),
    assessments: Boolean(features.assessments),
  };
}

/**
 * Mask secret fields in a tenant object for API responses.
 * Returns a shallow copy with sharetribeClientSecret and integrationApiKey
 * masked to show only the last 4 characters (e.g. '••••••ab1234').
 */
function maskSecrets(tenant) {
  if (!tenant) return tenant;

  const masked = { ...tenant };

  if (masked.sharetribeClientSecret) {
    const secret = masked.sharetribeClientSecret;
    masked.sharetribeClientSecret =
      secret.length > 4 ? '****' + secret.slice(-4) : '****';
  }

  if (masked.integrationApiKey) {
    const key = masked.integrationApiKey;
    masked.integrationApiKey =
      key.length > 4 ? '****' + key.slice(-4) : '****';
  }

  return masked;
}

// ================ API HANDLERS ================ //

/**
 * List all tenants
 * GET /api/admin/tenants
 *
 * Query params:
 *   - status: Filter by status ('active', 'inactive', 'trial', 'onboarding', 'suspended', 'pending-request')
 */
async function listTenants(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    let tenantList = Array.from(tenants.values());

    // Filter by status if provided
    const { status } = req.query;
    if (status && VALID_STATUSES.includes(status)) {
      tenantList = tenantList.filter(t => t.status === status);
    }

    // Sort by name
    tenantList.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      data: tenantList.map(maskSecrets),
      total: tenantList.length,
    });
  } catch (e) {
    console.error('Error listing tenants:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a single tenant by ID
 * GET /api/admin/tenants/:tenantId
 */
async function getTenant(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { tenantId } = req.params;
    const tenant = tenants.get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error getting tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a new tenant
 * POST /api/admin/tenants
 *
 * Body: {
 *   id: string,                    // Unique tenant ID (e.g. 'harvard', 'mit')
 *   name: string,                  // Display name (e.g. 'Harvard University')
 *   domain: string,                // Subdomain (e.g. 'harvard.street2ivy.com')
 *   status: string,                // 'active' | 'inactive' | 'trial' | 'onboarding' | 'suspended' | 'pending-request'
 *   branding: {                    // All fields optional
 *     marketplaceColor: string,
 *     colorPrimaryButton: string,
 *     marketplaceName: string,
 *     logoUrl: string,
 *     faviconUrl: string,
 *     brandImageUrl: string,
 *     facebookImageUrl: string,
 *     twitterImageUrl: string,
 *   },
 *   features: {                    // All fields optional, default to false
 *     aiCoaching: boolean,
 *     nda: boolean,
 *     assessments: boolean,
 *   },
 *   institutionDomain: string,     // Optional — institution domain (e.g. 'harvard.edu')
 *   contactEmail: string,          // Optional — edu admin contact email
 *   sharetribeClientId: string,    // Optional — per-tenant Sharetribe client ID
 *   sharetribeClientSecret: string,// Optional — per-tenant Sharetribe client secret
 *   integrationApiKey: string,     // Optional — per-tenant integration API key
 * }
 */
async function createTenant(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const {
      id,
      name,
      domain,
      status,
      branding,
      features,
      institutionDomain,
      contactEmail,
      sharetribeClientId,
      sharetribeClientSecret,
      integrationApiKey,
    } = req.body;

    // Validate required fields
    if (!id || !name || !domain) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, and domain are required.',
      });
    }

    // Validate tenant ID format
    if (!isValidTenantId(id)) {
      return res.status(400).json({
        error: 'Invalid tenant ID. Must be 3-64 characters, lowercase alphanumeric and hyphens only, must start and end with alphanumeric.',
      });
    }

    // Check for duplicate ID
    if (tenants.has(id)) {
      return res.status(409).json({ error: `Tenant with ID "${id}" already exists.` });
    }

    // Check for duplicate domain
    const existingByDomain = Array.from(tenants.values()).find(t => t.domain === domain);
    if (existingByDomain) {
      return res.status(409).json({
        error: `Domain "${domain}" is already assigned to tenant "${existingByDomain.id}".`,
      });
    }

    // Validate institutionDomain if provided
    if (institutionDomain) {
      if (!isValidDomain(institutionDomain)) {
        return res.status(400).json({
          error: 'Invalid institutionDomain. Must be a valid domain (e.g. harvard.edu).',
        });
      }
      // Check for duplicate institutionDomain
      const existingByInstitutionDomain = Array.from(tenants.values()).find(
        t => t.institutionDomain === institutionDomain
      );
      if (existingByInstitutionDomain) {
        return res.status(409).json({
          error: `Institution domain "${institutionDomain}" is already assigned to tenant "${existingByInstitutionDomain.id}".`,
        });
      }
    }

    // Validate contactEmail if provided
    if (contactEmail) {
      if (!isValidEmail(contactEmail)) {
        return res.status(400).json({
          error: 'Invalid contactEmail. Must be a valid email address.',
        });
      }
    }

    // Validate status
    const tenantStatus = status && VALID_STATUSES.includes(status) ? status : 'inactive';

    // Validate branding
    const brandingResult = validateBranding(branding);
    if (!brandingResult.valid) {
      return res.status(400).json({ error: 'Invalid branding values', details: brandingResult.errors });
    }

    // Build tenant object
    const now = new Date().toISOString();
    const tenant = {
      id: sanitizeString(id, { maxLength: 64 }),
      name: sanitizeString(name, { maxLength: 200 }),
      domain: sanitizeString(domain, { maxLength: 255 }),
      status: tenantStatus,
      branding: brandingResult.branding,
      features: validateFeatures(features),
      institutionDomain: institutionDomain
        ? sanitizeString(institutionDomain, { maxLength: 255 })
        : null,
      contactEmail: contactEmail
        ? sanitizeString(contactEmail, { maxLength: 254 })
        : null,
      sharetribeClientId: sharetribeClientId
        ? sanitizeString(sharetribeClientId, { maxLength: 255 })
        : null,
      sharetribeClientSecret: sharetribeClientSecret
        ? sanitizeString(sharetribeClientSecret, { maxLength: 255 })
        : null,
      integrationApiKey: integrationApiKey
        ? sanitizeString(integrationApiKey, { maxLength: 255 })
        : null,
      createdAt: now,
      updatedAt: now,
    };

    tenants.set(tenant.id, tenant);
    await saveTenants();

    console.log(`Tenant created: ${tenant.id} (${tenant.name})`);
    res.status(201).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error creating tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update an existing tenant
 * PUT /api/admin/tenants/:tenantId
 *
 * Body: Same as create, but all fields are optional (only provided fields are updated)
 */
async function updateTenant(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { tenantId } = req.params;
    const existing = tenants.get(tenantId);

    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const {
      name,
      domain,
      status,
      branding,
      features,
      institutionDomain,
      contactEmail,
      sharetribeClientId,
      sharetribeClientSecret,
      integrationApiKey,
    } = req.body;

    // If domain is changing, check for conflicts
    if (domain && domain !== existing.domain) {
      const existingByDomain = Array.from(tenants.values()).find(
        t => t.domain === domain && t.id !== tenantId
      );
      if (existingByDomain) {
        return res.status(409).json({
          error: `Domain "${domain}" is already assigned to tenant "${existingByDomain.id}".`,
        });
      }
    }

    // Validate institutionDomain if provided
    if (institutionDomain !== undefined && institutionDomain !== null) {
      if (institutionDomain !== '' && !isValidDomain(institutionDomain)) {
        return res.status(400).json({
          error: 'Invalid institutionDomain. Must be a valid domain (e.g. harvard.edu).',
        });
      }
      // Check for duplicate institutionDomain (exclude current tenant)
      if (institutionDomain && institutionDomain !== existing.institutionDomain) {
        const existingByInstitutionDomain = Array.from(tenants.values()).find(
          t => t.institutionDomain === institutionDomain && t.id !== tenantId
        );
        if (existingByInstitutionDomain) {
          return res.status(409).json({
            error: `Institution domain "${institutionDomain}" is already assigned to tenant "${existingByInstitutionDomain.id}".`,
          });
        }
      }
    }

    // Validate contactEmail if provided
    if (contactEmail !== undefined && contactEmail !== null && contactEmail !== '') {
      if (!isValidEmail(contactEmail)) {
        return res.status(400).json({
          error: 'Invalid contactEmail. Must be a valid email address.',
        });
      }
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Validate branding if provided
    let mergedBranding = existing.branding;
    if (branding) {
      const brandingResult = validateBranding({ ...existing.branding, ...branding });
      if (!brandingResult.valid) {
        return res.status(400).json({ error: 'Invalid branding values', details: brandingResult.errors });
      }
      mergedBranding = brandingResult.branding;
    }

    // Build updated tenant
    const updated = {
      ...existing,
      name: name ? sanitizeString(name, { maxLength: 200 }) : existing.name,
      domain: domain ? sanitizeString(domain, { maxLength: 255 }) : existing.domain,
      status: status || existing.status,
      branding: mergedBranding,
      features: features ? validateFeatures({ ...existing.features, ...features }) : existing.features,
      institutionDomain: institutionDomain !== undefined
        ? (institutionDomain ? sanitizeString(institutionDomain, { maxLength: 255 }) : null)
        : (existing.institutionDomain || null),
      contactEmail: contactEmail !== undefined
        ? (contactEmail ? sanitizeString(contactEmail, { maxLength: 254 }) : null)
        : (existing.contactEmail || null),
      sharetribeClientId: sharetribeClientId !== undefined
        ? (sharetribeClientId ? sanitizeString(sharetribeClientId, { maxLength: 255 }) : null)
        : (existing.sharetribeClientId || null),
      sharetribeClientSecret: sharetribeClientSecret !== undefined
        ? (sharetribeClientSecret ? sanitizeString(sharetribeClientSecret, { maxLength: 255 }) : null)
        : (existing.sharetribeClientSecret || null),
      integrationApiKey: integrationApiKey !== undefined
        ? (integrationApiKey ? sanitizeString(integrationApiKey, { maxLength: 255 }) : null)
        : (existing.integrationApiKey || null),
      updatedAt: new Date().toISOString(),
    };

    tenants.set(tenantId, updated);
    await saveTenants();

    console.log(`Tenant updated: ${tenantId}`);
    res.status(200).json({ data: maskSecrets(updated) });
  } catch (e) {
    console.error('Error updating tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a tenant
 * DELETE /api/admin/tenants/:tenantId
 */
async function deleteTenant(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { tenantId } = req.params;
    const existing = tenants.get(tenantId);

    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenants.delete(tenantId);
    await saveTenants();

    console.log(`Tenant deleted: ${tenantId}`);
    res.status(200).json({ data: null, message: `Tenant "${tenantId}" has been deleted.` });
  } catch (e) {
    console.error('Error deleting tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update only a tenant's branding
 * PUT /api/admin/tenants/:tenantId/branding
 *
 * Body: branding object (same shape as create)
 * This is a convenience endpoint for partial branding updates.
 */
async function updateTenantBranding(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { tenantId } = req.params;
    const existing = tenants.get(tenantId);

    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const brandingInput = req.body;
    const merged = { ...existing.branding, ...brandingInput };
    const brandingResult = validateBranding(merged);

    if (!brandingResult.valid) {
      return res.status(400).json({ error: 'Invalid branding values', details: brandingResult.errors });
    }

    const updated = {
      ...existing,
      branding: brandingResult.branding,
      updatedAt: new Date().toISOString(),
    };

    tenants.set(tenantId, updated);
    await saveTenants();

    console.log(`Tenant branding updated: ${tenantId}`);
    res.status(200).json({ data: maskSecrets(updated) });
  } catch (e) {
    console.error('Error updating tenant branding:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Public endpoint: Resolve tenant by domain
 * GET /api/tenants/resolve?domain=harvard.street2ivy.com
 *
 * This is called on page load to determine which tenant (if any)
 * corresponds to the current domain/subdomain.
 * Returns only branding data needed for rendering (no admin-only fields).
 */
async function resolveTenant(req, res) {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ error: 'domain query parameter is required' });
    }

    const sanitizedDomain = sanitizeString(domain, { maxLength: 255 });
    const tenant = Array.from(tenants.values()).find(
      t => t.domain === sanitizedDomain && t.status === 'active'
    );

    if (!tenant) {
      // No active tenant for this domain — return null (use default marketplace)
      return res.status(200).json({ data: null });
    }

    // Return only the fields needed for client-side rendering, with secrets masked
    const maskedTenant = maskSecrets(tenant);
    res.status(200).json({
      data: {
        id: maskedTenant.id,
        name: maskedTenant.name,
        domain: maskedTenant.domain,
        status: maskedTenant.status,
        branding: maskedTenant.branding,
        features: maskedTenant.features,
      },
    });
  } catch (e) {
    console.error('Error resolving tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a tenant by institution domain
 * GET /api/admin/tenants/by-domain/:domain
 *
 * Requires system admin or educational admin auth.
 */
async function getByInstitutionDomain(req, res) {
  try {
    // Try system admin first, then educational admin
    let admin = await verifySystemAdmin(req, res);
    if (!admin) {
      admin = await verifyEducationalAdmin(req, res);
    }
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator or educational administrator privileges required.',
      });
    }

    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: 'domain parameter is required' });
    }

    const tenant = Array.from(tenants.values()).find(
      t => t.institutionDomain === domain
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found for the given institution domain' });
    }

    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error getting tenant by institution domain:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  list: listTenants,
  get: getTenant,
  create: createTenant,
  update: updateTenant,
  delete: deleteTenant,
  updateBranding: updateTenantBranding,
  resolve: resolveTenant,
  getByInstitutionDomain: getByInstitutionDomain,
};
