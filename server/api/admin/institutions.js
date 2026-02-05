/**
 * Institution Membership Management API
 *
 * Manages institution (school) memberships for Street2Ivy.
 * Schools must pay for membership before their students can access the platform.
 *
 * Only system admins can manage institutions.
 */

const { getIntegrationSdk, handleError, serialize } = require('../../api-util/sdk');

// In-memory store for institutions (in production, use a database)
// This maps email domains to institution membership data
let institutionMemberships = new Map();

// Initialize with test institutions for development
institutionMemberships.set('test.edu', {
  domain: 'test.edu',
  name: 'Test University',
  membershipStatus: 'active',
  membershipStartDate: '2024-01-01',
  membershipEndDate: '2026-12-31',
  aiCoachingEnabled: true,
  aiCoachingUrl: 'https://coaching.street2ivy.com/test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

institutionMemberships.set('holycross.edu', {
  domain: 'holycross.edu',
  name: 'College of the Holy Cross',
  membershipStatus: 'active',
  membershipStartDate: '2024-01-01',
  membershipEndDate: '2026-12-31',
  aiCoachingEnabled: true,
  aiCoachingUrl: 'https://coaching.street2ivy.com/holycross',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Gmail for testing (remove in production)
institutionMemberships.set('gmail.com', {
  domain: 'gmail.com',
  name: 'Gmail Test Institution',
  membershipStatus: 'active',
  membershipStartDate: '2024-01-01',
  membershipEndDate: '2026-12-31',
  aiCoachingEnabled: true,
  aiCoachingUrl: 'https://coaching.street2ivy.com/test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

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
    const sdk = await getIntegrationSdk(req);
    await verifySystemAdmin(sdk);

    const institutions = Array.from(institutionMemberships.values());

    // Sort by name
    institutions.sort((a, b) => a.name.localeCompare(b.name));

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
    const sdk = await getIntegrationSdk(req);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    const institution = institutionMemberships.get(normalizedDomain);

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
 *
 * Body: {
 *   domain: 'harvard.edu',
 *   name: 'Harvard University',
 *   membershipStatus: 'active' | 'inactive' | 'pending',
 *   membershipStartDate: '2024-01-01',
 *   membershipEndDate: '2025-12-31',
 *   aiCoachingEnabled: true,
 *   aiCoachingUrl: 'https://...'
 * }
 */
async function createOrUpdateInstitution(req, res) {
  try {
    const sdk = await getIntegrationSdk(req);
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

    // Validate domain format (should be a valid .edu domain or similar)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(normalizedDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    const existingInstitution = institutionMemberships.get(normalizedDomain);
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

    institutionMemberships.set(normalizedDomain, institution);

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
 *
 * Body: { membershipStatus: 'active' | 'inactive' | 'pending' }
 */
async function updateInstitutionStatus(req, res) {
  try {
    const sdk = await getIntegrationSdk(req);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const { membershipStatus } = req.body;
    const normalizedDomain = domain.toLowerCase();

    const institution = institutionMemberships.get(normalizedDomain);

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (!['active', 'inactive', 'pending'].includes(membershipStatus)) {
      return res.status(400).json({ error: 'Invalid membership status' });
    }

    institution.membershipStatus = membershipStatus;
    institution.updatedAt = new Date().toISOString();

    institutionMemberships.set(normalizedDomain, institution);

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
 *
 * Body: { aiCoachingEnabled: true, aiCoachingUrl: 'https://...' }
 */
async function updateCoachingSettings(req, res) {
  try {
    const sdk = await getIntegrationSdk(req);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const { aiCoachingEnabled, aiCoachingUrl } = req.body;
    const normalizedDomain = domain.toLowerCase();

    const institution = institutionMemberships.get(normalizedDomain);

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

    institutionMemberships.set(normalizedDomain, institution);

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
    const sdk = await getIntegrationSdk(req);
    await verifySystemAdmin(sdk);

    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    if (!institutionMemberships.has(normalizedDomain)) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    institutionMemberships.delete(normalizedDomain);

    res.status(200).json({ message: 'Institution deleted' });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Check institution membership (public endpoint for signup validation)
 * GET /api/institutions/check/:domain
 *
 * Returns membership status without requiring admin auth
 */
async function checkInstitutionMembership(req, res) {
  try {
    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();

    const institution = institutionMemberships.get(normalizedDomain);

    if (!institution) {
      return res.status(200).json({
        isMember: false,
        message:
          'Your institution is not a member of Street2Ivy. Please contact your school administrator.',
      });
    }

    const isActive = institution.membershipStatus === 'active';
    const now = new Date();
    const startDate = institution.membershipStartDate
      ? new Date(institution.membershipStartDate)
      : null;
    const endDate = institution.membershipEndDate ? new Date(institution.membershipEndDate) : null;

    // Check if membership is within valid dates
    const isWithinDates = (!startDate || now >= startDate) && (!endDate || now <= endDate);
    const isMember = isActive && isWithinDates;

    res.status(200).json({
      isMember,
      institutionName: institution.name,
      aiCoachingEnabled: isMember ? institution.aiCoachingEnabled : false,
      aiCoachingUrl: isMember && institution.aiCoachingEnabled ? institution.aiCoachingUrl : null,
      message: isMember
        ? 'Your institution is an active member of Street2Ivy.'
        : 'Your institution membership is not currently active. Please contact your school administrator.',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Get current user's institution info (for students)
 * GET /api/institutions/my-institution
 *
 * Returns the institution info based on the logged-in student's email domain
 */
async function getMyInstitution(req, res) {
  try {
    const sdk = await getIntegrationSdk(req);
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

    const institution = institutionMemberships.get(emailDomain);

    if (!institution) {
      return res.status(200).json({
        isMember: false,
        institutionName: null,
        aiCoachingEnabled: false,
        aiCoachingUrl: null,
        message: 'Your institution is not a member of Street2Ivy.',
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

// Export the in-memory store for use by other modules (e.g., middleware)
function getInstitutionMemberships() {
  return institutionMemberships;
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
