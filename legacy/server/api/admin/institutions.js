/**
 * Institution Membership Management API
 *
 * Manages institution (school) memberships for Street2Ivy.
 * Schools must pay for membership before their students can access the platform.
 *
 * Only system admins can manage institutions.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../../api-util/db');
const { getIntegrationSdkForTenant } = require('../../api-util/integrationSdk');
const { handleError, serialize } = require('../../api-util/sdk');

// Seed dev-only institutions on first startup (only when table is empty in dev)
(function seedDevInstitutions() {
  const existing = db.institutions.getAll();
  if (existing.length > 0) {
    console.log(`Loaded ${existing.length} institutions from database`);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Initializing with test institutions');
    const now = new Date().toISOString();
    db.institutions.upsert({
      domain: 'test.edu',
      name: 'Test University',
      membershipStatus: 'active',
      membershipStartDate: '2024-01-01',
      membershipEndDate: '2026-12-31',
      aiCoachingEnabled: true,
      aiCoachingUrl: 'https://coaching.street2ivy.com/test',
      createdAt: now,
      updatedAt: now,
    });
    db.institutions.upsert({
      domain: 'gmail.com',
      name: 'Gmail Test Institution (DEV ONLY)',
      membershipStatus: 'active',
      membershipStartDate: '2024-01-01',
      membershipEndDate: '2026-12-31',
      aiCoachingEnabled: true,
      aiCoachingUrl: 'https://coaching.street2ivy.com/test',
      createdAt: now,
      updatedAt: now,
    });
  } else {
    console.log('Production mode: No test institutions loaded. Add institutions via Admin Dashboard.');
  }
})();

/**
 * Helper to verify user is a system admin
 */
async function verifySystemAdmin(sdk) {
  const currentUserRes = await sdk.currentUser.show();
  const currentUser = currentUserRes.data.data;
  const userType = currentUser.attributes.profile.publicData?.userType;

  if (userType !== 'system-admin') {
    throw { status: 403, message: 'Access denied. System admin only.' };
  }

  return currentUser;
}

/**
 * List all institutions
 * GET /api/admin/institutions
 */
async function listInstitutions(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const institutions = db.institutions.getAll();

    res.status(200).json({
      data: institutions,
      total: institutions.length,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Get institution by domain
 * GET /api/admin/institutions/:domain
 */
async function getInstitution(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    const institution = db.institutions.getByDomain(normalizedDomain);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    res.status(200).json({ data: institution });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Create or update institution membership
 * POST /api/admin/institutions
 */
async function createOrUpdateInstitution(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const {
      domain,
      name,
      membershipStatus = 'pending',
      membershipStartDate,
      membershipEndDate,
      aiCoachingEnabled = false,
      aiCoachingUrl = '',
    } = req.body;

    if (!domain || !name) {
      return res.status(400).json({ error: 'Domain and name are required' });
    }

    const normalizedDomain = domain.toLowerCase();

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(normalizedDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    const existingInstitution = db.institutions.getByDomain(normalizedDomain);
    const now = new Date().toISOString();

    const institution = {
      domain: normalizedDomain,
      name,
      membershipStatus,
      membershipStartDate: membershipStartDate || null,
      membershipEndDate: membershipEndDate || null,
      aiCoachingEnabled,
      aiCoachingUrl: aiCoachingUrl || '',
      createdAt: existingInstitution?.createdAt || now,
      updatedAt: now,
    };

    db.institutions.upsert(institution);

    res.status(200).json({
      data: institution,
      message: existingInstitution ? 'Institution updated' : 'Institution created',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Update institution membership status
 * POST /api/admin/institutions/:domain/status
 */
async function updateInstitutionStatus(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const { membershipStatus } = req.body;
    const normalizedDomain = domain.toLowerCase();

    const institution = db.institutions.getByDomain(normalizedDomain);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (!['active', 'inactive', 'pending'].includes(membershipStatus)) {
      return res.status(400).json({ error: 'Invalid membership status' });
    }

    institution.membershipStatus = membershipStatus;
    institution.updatedAt = new Date().toISOString();
    db.institutions.upsert(institution);

    res.status(200).json({
      data: institution,
      message: 'Institution status updated',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Update AI coaching settings for an institution
 * POST /api/admin/institutions/:domain/coaching
 */
async function updateCoachingSettings(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const { aiCoachingEnabled, aiCoachingUrl } = req.body;
    const normalizedDomain = domain.toLowerCase();

    const institution = db.institutions.getByDomain(normalizedDomain);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (typeof aiCoachingEnabled === 'boolean') {
      institution.aiCoachingEnabled = aiCoachingEnabled;
    }
    if (typeof aiCoachingUrl === 'string') {
      institution.aiCoachingUrl = aiCoachingUrl;
    }
    institution.updatedAt = new Date().toISOString();
    db.institutions.upsert(institution);

    res.status(200).json({
      data: institution,
      message: 'AI coaching settings updated',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Delete institution
 * DELETE /api/admin/institutions/:domain
 */
async function deleteInstitution(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    if (!db.institutions.getByDomain(normalizedDomain)) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    db.institutions.delete(normalizedDomain);

    res.status(200).json({ message: 'Institution deleted' });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Check institution membership (public endpoint for signup validation)
 * GET /api/institutions/check/:domain
 */
async function checkInstitutionMembership(req, res) {
  try {
    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    const institution = db.institutions.getByDomain(normalizedDomain);

    if (!institution) {
      return res.status(200).json({
        isMember: false,
        message:
          'Your institution is not a member of Campus2Career. Please contact your school administrator.',
      });
    }

    const isActive = institution.membershipStatus === 'active';
    const now = new Date();
    const startDate = institution.membershipStartDate
      ? new Date(institution.membershipStartDate)
      : null;
    const endDate = institution.membershipEndDate ? new Date(institution.membershipEndDate) : null;

    const isWithinDates = (!startDate || now >= startDate) && (!endDate || now <= endDate);
    const isMember = isActive && isWithinDates;

    res.status(200).json({
      isMember,
      institutionName: institution.name,
      aiCoachingEnabled: isMember ? institution.aiCoachingEnabled : false,
      aiCoachingUrl: isMember && institution.aiCoachingEnabled ? institution.aiCoachingUrl : null,
      message: isMember
        ? 'Your institution is an active member of Campus2Career.'
        : 'Your institution membership is not currently active. Please contact your school administrator.',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Get current user's institution info (for students)
 * GET /api/institutions/my-institution
 */
async function getMyInstitution(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    const currentUserRes = await sdk.currentUser.show();
    const currentUser = currentUserRes.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'student') {
      return res.status(403).json({ error: 'This endpoint is for students only' });
    }

    const emailDomain = publicData.emailDomain?.toLowerCase();

    if (!emailDomain) {
      return res.status(400).json({ error: 'Email domain not found' });
    }

    const institution = db.institutions.getByDomain(emailDomain);

    if (!institution) {
      return res.status(200).json({
        isMember: false,
        institutionName: null,
        aiCoachingEnabled: false,
        aiCoachingUrl: null,
        message: 'Your institution is not a member of Campus2Career.',
      });
    }

    const isActive = institution.membershipStatus === 'active';
    const now = new Date();
    const startDate = institution.membershipStartDate
      ? new Date(institution.membershipStartDate)
      : null;
    const endDate = institution.membershipEndDate ? new Date(institution.membershipEndDate) : null;
    const isWithinDates = (!startDate || now >= startDate) && (!endDate || now <= endDate);
    const isMember = isActive && isWithinDates;

    res.status(200).json({
      isMember,
      institutionName: institution.name,
      aiCoachingEnabled: isMember ? institution.aiCoachingEnabled : false,
      aiCoachingUrl: isMember && institution.aiCoachingEnabled ? institution.aiCoachingUrl : null,
      membershipStatus: institution.membershipStatus,
    });
  } catch (e) {
    handleError(res, e);
  }
}

// Export a helper for other modules (e.g., middleware) that need institution lookups.
// Now returns the db accessor instead of an in-memory Map.
function getInstitutionMemberships() {
  // Return a Map-like object backed by the database for backward compatibility
  const institutions = db.institutions.getAll();
  const map = new Map();
  institutions.forEach(inst => map.set(inst.domain, inst));
  return map;
}

module.exports = {
  list: listInstitutions,
  get: getInstitution,
  createOrUpdate: createOrUpdateInstitution,
  updateStatus: updateInstitutionStatus,
  updateCoaching: updateCoachingSettings,
  delete: deleteInstitution,
  checkMembership: checkInstitutionMembership,
  getMyInstitution: getMyInstitution,
  getInstitutionMemberships,
};
