/**
 * Education Tenant API
 *
 * Edu-admin-scoped tenant operations for Street2Ivy.
 * Educational admins can manage their own institution's tenant
 * (branding, settings, activation). System admins can manage
 * tenant requests (list, approve, reject).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  verifyEducationalAdmin,
  verifySystemAdmin,
  sanitizeString,
  isValidEmail,
} = require('../api-util/security');
const { readJSON, atomicWriteJSON } = require('../api-util/jsonStore');
const { sendEmail } = require('../api-util/emailService');
const { tenantRequestReceived, tenantApproved, tenantRejected } = require('../api-util/emailTemplates');

const TENANTS_FILE = path.join(__dirname, '../data/tenants.json');
const TENANT_REQUESTS_FILE = path.join(__dirname, '../data/tenant-requests.json');

// ================ HELPERS ================ //

/**
 * Load tenants from the JSON file (with .bak fallback via jsonStore)
 */
function loadTenants() {
  return readJSON(TENANTS_FILE, []);
}

/**
 * Save tenants to the JSON file (atomic write with backup via jsonStore)
 */
async function saveTenants(tenantList) {
  return atomicWriteJSON(TENANTS_FILE, tenantList);
}

/**
 * Load tenant requests from the JSON file (with .bak fallback via jsonStore)
 */
function loadTenantRequests() {
  return readJSON(TENANT_REQUESTS_FILE, []);
}

/**
 * Save tenant requests to the JSON file (atomic write with backup via jsonStore)
 */
async function saveTenantRequests(requests) {
  return atomicWriteJSON(TENANT_REQUESTS_FILE, requests);
}

/**
 * Find a tenant by its institutionDomain
 */
function findTenantByDomain(institutionDomain) {
  const tenants = loadTenants();
  return tenants.find(t => t.institutionDomain === institutionDomain);
}

/**
 * Mask sensitive fields on a tenant object.
 * Shows only the last 4 characters of sharetribeClientSecret and integrationApiKey.
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

/**
 * Validate a hex color string
 */
function isValidHexColor(color) {
  if (!color) return true;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validate a URL string
 */
function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ================ EDU-ADMIN ENDPOINTS ================ //

/**
 * Get the current educational admin's tenant
 * GET /api/education/tenant
 */
async function getMyTenant(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(200).json({ data: null });
    }

    const tenant = findTenantByDomain(institutionDomain);

    if (!tenant) {
      return res.status(200).json({ data: null });
    }

    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error getting edu tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update branding for the educational admin's tenant
 * PUT /api/education/tenant/branding
 */
async function updateBranding(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(403).json({ error: 'No institution domain associated with your account.' });
    }

    const tenants = loadTenants();
    const tenantIndex = tenants.findIndex(t => t.institutionDomain === institutionDomain);

    if (tenantIndex === -1 || tenants[tenantIndex].status === 'pending-request') {
      return res.status(403).json({ error: 'Tenant not available for branding updates.' });
    }

    // Block suspended tenants from making changes
    if (tenants[tenantIndex].status === 'suspended') {
      return res.status(403).json({ error: 'Tenant is suspended. Contact support for assistance.' });
    }

    const tenant = tenants[tenantIndex];
    const { marketplaceColor, marketplaceName, logoUrl, colorPrimaryButton, faviconUrl, brandImageUrl } = req.body;

    // Validate hex colors
    const errors = [];
    if (marketplaceColor && !isValidHexColor(marketplaceColor)) {
      errors.push('marketplaceColor must be a valid hex color (e.g. #A51C30)');
    }
    if (colorPrimaryButton && !isValidHexColor(colorPrimaryButton)) {
      errors.push('colorPrimaryButton must be a valid hex color');
    }

    // Validate URLs
    if (logoUrl && !isValidUrl(logoUrl)) {
      errors.push('logoUrl must be a valid URL');
    }
    if (faviconUrl && !isValidUrl(faviconUrl)) {
      errors.push('faviconUrl must be a valid URL');
    }
    if (brandImageUrl && !isValidUrl(brandImageUrl)) {
      errors.push('brandImageUrl must be a valid URL');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid branding values', details: errors });
    }

    // Merge with existing branding
    const existingBranding = tenant.branding || {};
    const updatedBranding = {
      ...existingBranding,
    };

    if (marketplaceColor !== undefined) updatedBranding.marketplaceColor = marketplaceColor || null;
    if (marketplaceName !== undefined) updatedBranding.marketplaceName = marketplaceName ? sanitizeString(marketplaceName, { maxLength: 100 }) : null;
    if (logoUrl !== undefined) updatedBranding.logoUrl = logoUrl || null;
    if (colorPrimaryButton !== undefined) updatedBranding.colorPrimaryButton = colorPrimaryButton || null;
    if (faviconUrl !== undefined) updatedBranding.faviconUrl = faviconUrl || null;
    if (brandImageUrl !== undefined) updatedBranding.brandImageUrl = brandImageUrl || null;

    tenant.branding = updatedBranding;
    tenant.updatedAt = new Date().toISOString();
    tenants[tenantIndex] = tenant;
    await saveTenants(tenants);

    console.log(`Tenant branding updated by edu-admin: ${tenant.id}`);
    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error updating tenant branding:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update settings/features for the educational admin's tenant
 * PUT /api/education/tenant/settings
 */
async function updateSettings(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(403).json({ error: 'No institution domain associated with your account.' });
    }

    const tenants = loadTenants();
    const tenantIndex = tenants.findIndex(t => t.institutionDomain === institutionDomain);

    if (tenantIndex === -1 || tenants[tenantIndex].status === 'pending-request') {
      return res.status(403).json({ error: 'Tenant not available for settings updates.' });
    }

    // Block suspended tenants from making changes
    if (tenants[tenantIndex].status === 'suspended') {
      return res.status(403).json({ error: 'Tenant is suspended. Contact support for assistance.' });
    }

    const tenant = tenants[tenantIndex];
    const { aiCoaching, nda, assessments, sectionVisibility } = req.body;

    // Update features with only boolean values
    const existingFeatures = tenant.features || { aiCoaching: false, nda: false, assessments: false };
    const updatedFeatures = {
      aiCoaching: aiCoaching !== undefined ? Boolean(aiCoaching) : existingFeatures.aiCoaching,
      nda: nda !== undefined ? Boolean(nda) : existingFeatures.nda,
      assessments: assessments !== undefined ? Boolean(assessments) : existingFeatures.assessments,
    };

    tenant.features = updatedFeatures;

    // Update section visibility if provided (allows education admins to hide/show landing page sections)
    if (sectionVisibility && typeof sectionVisibility === 'object') {
      const validSections = ['hero', 'statistics', 'features', 'howItWorks', 'videoTestimonial', 'testimonials', 'aiCoaching', 'cta'];
      const sanitized = {};
      validSections.forEach(key => {
        if (sectionVisibility[key] !== undefined) {
          sanitized[key] = Boolean(sectionVisibility[key]);
        }
      });
      tenant.sectionVisibility = { ...(tenant.sectionVisibility || {}), ...sanitized };
    }

    tenant.updatedAt = new Date().toISOString();
    tenants[tenantIndex] = tenant;
    await saveTenants(tenants);

    console.log(`Tenant settings updated by edu-admin: ${tenant.id}`);
    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error updating tenant settings:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Activate the educational admin's tenant
 * POST /api/education/tenant/activate
 */
async function activateTenant(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(403).json({ error: 'No institution domain associated with your account.' });
    }

    const tenants = loadTenants();
    const tenantIndex = tenants.findIndex(t => t.institutionDomain === institutionDomain);

    if (tenantIndex === -1) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const tenant = tenants[tenantIndex];

    if (tenant.status !== 'onboarding') {
      return res.status(400).json({
        error: `Tenant cannot be activated. Current status is "${tenant.status}". Only tenants with status "onboarding" can be activated.`,
      });
    }

    tenant.status = 'active';
    tenant.updatedAt = new Date().toISOString();
    tenants[tenantIndex] = tenant;
    await saveTenants(tenants);

    console.log(`Tenant activated by edu-admin: ${tenant.id}`);
    res.status(200).json({ data: maskSecrets(tenant) });
  } catch (e) {
    console.error('Error activating tenant:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit a tenant request
 * POST /api/education/tenant-request
 */
async function submitTenantRequest(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain associated with your account.' });
    }

    // Check if a tenant already exists for this institution
    const existingTenant = findTenantByDomain(institutionDomain);
    if (existingTenant) {
      return res.status(409).json({ error: 'A tenant already exists for your institution.' });
    }

    // Check if a request already exists
    const requests = loadTenantRequests();
    const existingRequest = requests.find(
      r => r.institutionDomain === institutionDomain && r.status === 'pending'
    );
    if (existingRequest) {
      return res.status(409).json({ error: 'A tenant request has already been submitted for your institution.' });
    }

    const { institutionName, adminName, adminEmail, reason } = req.body;

    // Validate required fields
    if (!institutionName || !adminName || !adminEmail) {
      return res.status(400).json({
        error: 'Missing required fields: institutionName, adminName, and adminEmail are required.',
      });
    }

    if (!isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'adminEmail must be a valid email address.' });
    }

    // Generate a unique request ID
    const requestId = 'req_' + crypto.randomBytes(8).toString('hex');

    const request = {
      id: requestId,
      institutionDomain,
      institutionName: sanitizeString(institutionName, { maxLength: 200 }),
      adminName: sanitizeString(adminName, { maxLength: 100 }),
      adminEmail: sanitizeString(adminEmail, { maxLength: 254 }),
      reason: reason ? sanitizeString(reason, { maxLength: 1000 }) : null,
      userId: user.id?.uuid || null,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
    };

    requests.push(request);
    await saveTenantRequests(requests);

    // Send confirmation email to the edu-admin (non-blocking)
    const emailTemplate = tenantRequestReceived({
      adminName: request.adminName,
      adminEmail: request.adminEmail,
      institutionName: request.institutionName,
      requestId: request.id,
    });

    sendEmail({
      to: request.adminEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { requestId: request.id, institutionDomain },
    }).catch(err => console.error('[Tenant] Request confirmation email error (non-blocking):', err.message));

    console.log(`Tenant request submitted: ${requestId} for ${institutionDomain}`);
    res.status(201).json({ data: request });
  } catch (e) {
    console.error('Error submitting tenant request:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Upload a logo for the educational admin's tenant
 * POST /api/education/tenant/logo
 *
 * Accepts JSON body with base64-encoded image data.
 * Body: { logoData: string (base64), mimeType: string, fileName: string }
 * Validates file type (PNG, JPEG, SVG) and size (max 2MB).
 */
async function uploadLogo(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const publicData = user.attributes?.profile?.publicData || {};
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(403).json({ error: 'No institution domain associated with your account.' });
    }

    const tenants = loadTenants();
    const tenantIndex = tenants.findIndex(t => t.institutionDomain === institutionDomain);

    if (tenantIndex === -1) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const { logoData, mimeType } = req.body;

    if (!logoData) {
      return res.status(400).json({ error: 'logoData (base64 encoded image) is required.' });
    }

    // Validate MIME type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const detectedMime = mimeType || 'image/png';
    if (!allowedTypes.includes(detectedMime)) {
      return res.status(400).json({
        error: `Invalid file type "${detectedMime}". Allowed: ${allowedTypes.join(', ')}`,
      });
    }

    // Decode base64 and check size (2MB max)
    const buffer = Buffer.from(logoData, 'base64');
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 2MB limit.' });
    }

    // Magic byte validation
    if (detectedMime === 'image/png') {
      const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      if (!pngSig.every((byte, i) => buffer[i] === byte)) {
        return res.status(400).json({ error: 'File content does not match PNG format.' });
      }
    } else if (detectedMime === 'image/jpeg' || detectedMime === 'image/jpg') {
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        return res.status(400).json({ error: 'File content does not match JPEG format.' });
      }
    } else if (detectedMime === 'image/svg+xml') {
      const svgContent = buffer.toString('utf8');
      if (/<script[\s>]/i.test(svgContent) ||
          /javascript\s*:/i.test(svgContent) ||
          /\son\w+\s*=/i.test(svgContent) ||
          /<foreignobject[\s>]/i.test(svgContent)) {
        return res.status(400).json({ error: 'SVG file contains potentially unsafe content.' });
      }
    }

    // Determine file extension and save
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/svg+xml': 'svg' };
    const ext = extMap[detectedMime] || 'png';

    const tenant = tenants[tenantIndex];
    const uploadDir = path.join(__dirname, '../uploads/tenants', tenant.id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const logoFileName = `logo.${ext}`;
    const filePath = path.join(uploadDir, logoFileName);
    fs.writeFileSync(filePath, buffer);

    // Update tenant branding
    const logoUrl = `/uploads/tenants/${tenant.id}/${logoFileName}`;
    tenant.branding = tenant.branding || {};
    tenant.branding.logoUrl = logoUrl;
    tenant.updatedAt = new Date().toISOString();
    tenants[tenantIndex] = tenant;
    await saveTenants(tenants);

    console.log(`Tenant logo uploaded: ${tenant.id} -> ${logoUrl}`);
    res.status(200).json({ data: { logoUrl, tenant: maskSecrets(tenant) } });
  } catch (e) {
    console.error('Error uploading tenant logo:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ================ SYSTEM ADMIN ENDPOINTS ================ //

/**
 * List all tenant requests
 * GET /api/admin/tenant-requests
 */
async function listTenantRequests(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const requests = loadTenantRequests();

    // Sort by submittedAt descending (newest first)
    requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.status(200).json({ data: requests });
  } catch (e) {
    console.error('Error listing tenant requests:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Approve a tenant request
 * POST /api/admin/tenant-requests/:id/approve
 */
async function approveTenantRequest(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { id } = req.params;
    const requests = loadTenantRequests();
    const requestIndex = requests.findIndex(r => r.id === id);

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Tenant request not found.' });
    }

    const request = requests[requestIndex];

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request has already been ${request.status}. Only pending requests can be approved.`,
      });
    }

    // Generate tenant slug and ID from institution name
    const slug = generateSlug(request.institutionName);

    if (!slug) {
      return res.status(400).json({ error: 'Could not generate a valid slug from the institution name.' });
    }

    // Create new tenant
    const now = new Date().toISOString();
    const tenant = {
      id: slug,
      name: request.institutionName,
      domain: `${slug}.street2ivy.com`,
      institutionDomain: request.institutionDomain,
      contactEmail: request.adminEmail,
      status: 'onboarding',
      branding: {
        marketplaceColor: null,
        colorPrimaryButton: null,
        marketplaceName: null,
        logoUrl: null,
        faviconUrl: null,
        brandImageUrl: null,
      },
      features: {
        aiCoaching: false,
        nda: false,
        assessments: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Update request status
    request.status = 'approved';
    request.reviewedAt = now;
    requests[requestIndex] = request;

    // Save request updates
    await saveTenantRequests(requests);

    // Add tenant to tenants list
    const tenants = loadTenants();
    tenants.push(tenant);
    await saveTenants(tenants);

    // Send approval email to the edu-admin (non-blocking)
    const emailTemplate = tenantApproved({
      adminName: request.adminName,
      adminEmail: request.adminEmail,
      institutionName: request.institutionName,
      tenantId: tenant.id,
    });

    sendEmail({
      to: request.adminEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { requestId: request.id, tenantId: tenant.id },
    }).catch(err => console.error('[Tenant] Approval email error (non-blocking):', err.message));

    console.log(`Tenant request approved: ${id} -> tenant ${tenant.id}`);
    res.status(200).json({ data: { request, tenant } });
  } catch (e) {
    console.error('Error approving tenant request:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Reject a tenant request
 * POST /api/admin/tenant-requests/:id/reject
 */
async function rejectTenantRequest(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { id } = req.params;
    const requests = loadTenantRequests();
    const requestIndex = requests.findIndex(r => r.id === id);

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Tenant request not found.' });
    }

    const request = requests[requestIndex];

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request has already been ${request.status}. Only pending requests can be rejected.`,
      });
    }

    const { reason } = req.body;

    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.rejectionReason = reason ? sanitizeString(reason, { maxLength: 1000 }) : null;
    requests[requestIndex] = request;

    await saveTenantRequests(requests);

    // Send rejection email to the edu-admin (non-blocking)
    const emailTemplate = tenantRejected({
      adminName: request.adminName,
      adminEmail: request.adminEmail,
      institutionName: request.institutionName,
      rejectionReason: request.rejectionReason,
    });

    sendEmail({
      to: request.adminEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { requestId: request.id },
    }).catch(err => console.error('[Tenant] Rejection email error (non-blocking):', err.message));

    console.log(`Tenant request rejected: ${id}`);
    res.status(200).json({ data: request });
  } catch (e) {
    console.error('Error rejecting tenant request:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ================ EXPORTS ================ //

module.exports = {
  getMyTenant,
  updateBranding,
  updateSettings,
  activateTenant,
  uploadLogo,
  submitTenantRequest,
  listTenantRequests,
  approveTenantRequest,
  rejectTenantRequest,
};
