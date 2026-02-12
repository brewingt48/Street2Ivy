/**
 * Tenant Landing Page Customization API
 *
 * Allows educational administrators to customize the landing page
 * for their institution's subdomain (e.g., howard.street2ivy.com).
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../api-util/db');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * SECURITY: Recursively sanitize content strings to prevent stored XSS.
 * Strips dangerous HTML tags and event handlers from string values.
 */
function sanitizeContentValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*\/?>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .replace(/vbscript\s*:/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeContentValue);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeContentValue(v);
    }
    return sanitized;
  }
  return value;
}

// Default tenant content template
const defaultTenantContent = {
  branding: {
    institutionName: '',
    tagline: '',
    logoUrl: '',
    primaryColor: '#1a1a2e',
    accentColor: '#e94560',
  },
  hero: {
    title: '',
    subtitle: '',
    backgroundImageUrl: '',
  },
  stats: {
    items: [
      { id: 'stat-1', value: 0, label: 'Students Matched', suffix: '+' },
      { id: 'stat-2', value: 0, label: 'Partner Companies', suffix: '+' },
      { id: 'stat-3', value: 0, label: 'Projects Completed', suffix: '+' },
    ],
  },
  testimonials: {
    items: [],
  },
  cta: {
    title: '',
    subtitle: '',
    buttonText: '',
    buttonUrl: '',
  },
  visibility: {
    showStats: true,
    showTestimonials: true,
    showHowItWorks: true,
    showAICoaching: true,
    showCTA: true,
  },
  updatedAt: null,
  updatedBy: null,
};

/**
 * SECURITY: Validate domain string to prevent path traversal attacks.
 * Only allows alphanumeric chars, dots, and hyphens (valid domain characters).
 *
 * Defense-in-depth: SQL injection is not possible with parameterized queries,
 * but this validation remains as an extra safety layer.
 */
function isValidDomainString(domain) {
  if (!domain || typeof domain !== 'string') return false;
  // Reject path traversal sequences, null bytes, and non-domain characters
  if (domain.includes('..') || domain.includes('/') || domain.includes('\\') || domain.includes('\0')) {
    return false;
  }
  // Only allow valid domain characters: alphanumeric, dots, hyphens
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(domain) && domain.length <= 253;
}

/**
 * Helper to verify user is an educational admin and get their institution domain
 */
async function verifyEducationalAdmin(sdk) {
  const currentUserRes = await sdk.currentUser.show();
  const currentUser = currentUserRes.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'educational-admin') {
    throw { status: 403, message: 'Access denied. Educational admin only.' };
  }

  const domain = publicData.institutionDomain || publicData.emailDomain;
  if (!domain) {
    throw { status: 400, message: 'No institution domain associated with this account.' };
  }

  return { currentUser, domain: domain.toLowerCase() };
}

/**
 * Get tenant content for the current educational admin's institution
 * GET /api/tenant-content/my-institution
 */
async function getMyTenantContent(req, res) {
  try {
    const sdk = getSdk(req, res);
    const { domain } = await verifyEducationalAdmin(sdk);

    // SECURITY: Defense-in-depth domain validation
    if (!isValidDomainString(domain)) {
      return res.status(400).json({ error: 'Invalid institution domain' });
    }

    const content = db.tenantContent.getByDomain(domain);

    res.status(200).json({
      data: content || { ...defaultTenantContent, branding: { ...defaultTenantContent.branding } },
      domain,
      hasCustomContent: !!content,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Update tenant content for the current educational admin's institution
 * PUT /api/tenant-content/my-institution
 *
 * Body: { branding: {...}, hero: {...}, stats: {...}, ... }
 */
async function updateMyTenantContent(req, res) {
  try {
    const sdk = getSdk(req, res);
    const { currentUser, domain } = await verifyEducationalAdmin(sdk);

    // SECURITY: Defense-in-depth domain validation
    if (!isValidDomainString(domain)) {
      return res.status(400).json({ error: 'Invalid institution domain' });
    }

    const existingContent = db.tenantContent.getByDomain(domain) || { ...defaultTenantContent };
    // SECURITY: Sanitize all input to prevent stored XSS
    const updates = sanitizeContentValue(req.body);

    // Merge updates into existing content
    const updatedContent = {
      ...existingContent,
      ...updates,
      branding: { ...existingContent.branding, ...(updates.branding || {}) },
      hero: { ...existingContent.hero, ...(updates.hero || {}) },
      stats: updates.stats || existingContent.stats,
      testimonials: updates.testimonials || existingContent.testimonials,
      cta: { ...existingContent.cta, ...(updates.cta || {}) },
      visibility: { ...existingContent.visibility, ...(updates.visibility || {}) },
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id.uuid,
    };

    db.tenantContent.set(domain, updatedContent, currentUser.id.uuid);

    res.status(200).json({
      data: updatedContent,
      domain,
      message: 'Tenant content updated successfully',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Get public tenant content by slug (for landing page rendering)
 * GET /api/tenant-content/public/:slug
 *
 * The slug corresponds to the subdomain (e.g., "howard" from howard.street2ivy.com)
 * We look up the institution by checking if any institution domain starts with the slug
 */
async function getPublicTenantContent(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const normalizedSlug = slug.toLowerCase();

    // Load institutions from SQLite
    const institutions = db.institutions.getAll();

    // Find institution whose domain matches the slug
    // e.g., slug "howard" matches "howard.edu"
    const matchedInstitution = institutions.find(inst => {
      const domainBase = inst.domain.split('.')[0].toLowerCase();
      return domainBase === normalizedSlug;
    });

    if (!matchedInstitution) {
      return res.status(404).json({
        error: 'Institution not found',
        slug: normalizedSlug,
      });
    }

    // Only serve content for active institutions
    if (matchedInstitution.membershipStatus !== 'active') {
      return res.status(403).json({
        error: 'Institution membership is not active',
      });
    }

    const content = db.tenantContent.getByDomain(matchedInstitution.domain);

    res.status(200).json({
      data: content || null,
      institution: {
        name: matchedInstitution.name,
        domain: matchedInstitution.domain,
        aiCoachingEnabled: matchedInstitution.aiCoachingEnabled,
      },
      hasCustomContent: !!content,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Reset tenant content to defaults
 * POST /api/tenant-content/my-institution/reset
 */
async function resetMyTenantContent(req, res) {
  try {
    const sdk = getSdk(req, res);
    const { domain } = await verifyEducationalAdmin(sdk);

    // SECURITY: Defense-in-depth domain validation
    if (!isValidDomainString(domain)) {
      return res.status(400).json({ error: 'Invalid institution domain' });
    }

    db.tenantContent.delete(domain);

    res.status(200).json({
      message: 'Tenant content reset to defaults',
      domain,
    });
  } catch (e) {
    handleError(res, e);
  }
}

module.exports = {
  getMyContent: getMyTenantContent,
  updateMyContent: updateMyTenantContent,
  getPublicContent: getPublicTenantContent,
  resetMyContent: resetMyTenantContent,
};
