/**
 * Tenant Landing Page Customization API
 *
 * Allows educational administrators to customize the landing page
 * for their institution's subdomain (e.g., howard.street2ivy.com).
 *
 * Customizations stored per-domain in server/data/tenant-content/<domain>.json
 */

const fs = require('fs');
const path = require('path');
const { getSdk, handleError } = require('../api-util/sdk');

const TENANT_CONTENT_DIR = path.join(__dirname, '../data/tenant-content');

// Ensure tenant content directory exists
if (!fs.existsSync(TENANT_CONTENT_DIR)) {
  fs.mkdirSync(TENANT_CONTENT_DIR, { recursive: true });
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
 * Load tenant content from file
 */
function loadTenantContent(domain) {
  const filePath = path.join(TENANT_CONTENT_DIR, `${domain}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading tenant content for ${domain}:`, error);
  }
  return null;
}

/**
 * Save tenant content to file
 */
function saveTenantContent(domain, content) {
  const filePath = path.join(TENANT_CONTENT_DIR, `${domain}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving tenant content for ${domain}:`, error);
    return false;
  }
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

    const content = loadTenantContent(domain);

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

    const existingContent = loadTenantContent(domain) || { ...defaultTenantContent };
    const updates = req.body;

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

    const saved = saveTenantContent(domain, updatedContent);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save tenant content' });
    }

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

    // Load institutions to find the matching domain
    const institutionsFile = path.join(__dirname, '../data/institutions.json');
    let institutions = [];
    try {
      if (fs.existsSync(institutionsFile)) {
        institutions = JSON.parse(fs.readFileSync(institutionsFile, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading institutions file:', err);
    }

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

    const content = loadTenantContent(matchedInstitution.domain);

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

    const filePath = path.join(TENANT_CONTENT_DIR, `${domain}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

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
