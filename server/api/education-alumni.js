/**
 * Alumni Invitation Management API
 *
 * Manages alumni invitations for educational admins.
 * Alumni data is stored in a separate JSON file, scoped by institutionDomain.
 *
 * Only educational admins can manage alumni invitations.
 */

const path = require('path');
const crypto = require('crypto');
const { verifyEducationalAdmin, sanitizeString, isValidEmail } = require('../api-util/security');
const { readJSON, atomicWriteJSON } = require('../api-util/jsonStore');
const { sendEmail } = require('../api-util/emailService');
const { alumniInvitation, alumniWelcome, alumniReminder } = require('../api-util/emailTemplates');

const ALUMNI_FILE = path.join(__dirname, '../data/alumni.json');

// ================ HELPERS ================ //

/**
 * Load alumni records from file (with .bak fallback via jsonStore)
 * @returns {Array} Array of alumni records, or empty array if file doesn't exist
 */
function loadAlumni() {
  return readJSON(ALUMNI_FILE, []);
}

/**
 * Save alumni records to file (atomic write with backup via jsonStore)
 * @param {Array} alumniList - Array of alumni records to persist
 * @returns {Promise<boolean>} Whether the save was successful
 */
async function saveAlumni(alumniList) {
  return atomicWriteJSON(ALUMNI_FILE, alumniList);
}

/**
 * Generate a unique alumni ID
 * @returns {string} Alumni ID in the format 'alum_xxxxxxxxxxxxxxxx'
 */
function generateAlumniId() {
  return 'alum_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Generate a unique invitation code for alumni invitations
 * @returns {string} 32-character hex string
 */
function generateInvitationCode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Look up tenant branding for an institution domain.
 * Used to brand outgoing emails with the institution's colors and logo.
 *
 * @param {string} institutionDomain - e.g. 'harvard.edu'
 * @returns {Object} Branding object or empty defaults
 */
async function getTenantBranding(institutionDomain) {
  try {
    const TENANTS_FILE = path.join(__dirname, '../data/tenants.json');
    const tenants = readJSON(TENANTS_FILE, []);
    const tenant = tenants.find(t => t.institutionDomain === institutionDomain);
    if (tenant && tenant.branding) {
      return {
        ...tenant.branding,
        marketplaceName: tenant.branding.marketplaceName || tenant.name || null,
      };
    }
    return {};
  } catch (err) {
    console.error('[Alumni] Error loading tenant branding:', err.message);
    return {};
  }
}

// ================ API HANDLERS ================ //

/**
 * Invite an alumni
 * POST /api/education/alumni/invite
 *
 * Body: {
 *   email: string (required),
 *   firstName: string (required),
 *   lastName: string (required),
 *   graduationYear: string (optional),
 *   program: string (optional),
 * }
 */
async function inviteAlumni(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account' });
    }

    const { email, firstName, lastName, graduationYear, program } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'email, firstName, and lastName are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    // Load existing alumni and check for duplicates
    const alumniList = loadAlumni();
    const duplicate = alumniList.find(
      a => a.email === email && a.institutionDomain === institutionDomain
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Alumni with this email has already been invited' });
    }

    // Build alumni record with sanitized fields
    const now = new Date().toISOString();
    const alumniRecord = {
      id: generateAlumniId(),
      institutionDomain: sanitizeString(institutionDomain, { maxLength: 255 }),
      email: sanitizeString(email, { maxLength: 254 }),
      firstName: sanitizeString(firstName, { maxLength: 200 }),
      lastName: sanitizeString(lastName, { maxLength: 200 }),
      graduationYear: graduationYear ? sanitizeString(String(graduationYear), { maxLength: 10 }) : null,
      program: program ? sanitizeString(program, { maxLength: 300 }) : null,
      status: 'invited',
      invitationCode: generateInvitationCode(),
      invitedBy: user.id?.uuid || null,
      invitedAt: now,
      acceptedAt: null,
      userId: null,
    };

    alumniList.push(alumniRecord);
    await saveAlumni(alumniList);

    // Send invitation email (non-blocking — email failure does not fail the invite)
    const tenantBranding = await getTenantBranding(institutionDomain);
    const emailTemplate = alumniInvitation({
      firstName: alumniRecord.firstName,
      lastName: alumniRecord.lastName,
      email: alumniRecord.email,
      institutionName: tenantBranding.marketplaceName || institutionDomain,
      invitationCode: alumniRecord.invitationCode,
      graduationYear: alumniRecord.graduationYear,
      program: alumniRecord.program,
      invitedByName: user.attributes?.profile?.displayName || null,
      branding: tenantBranding,
    });

    sendEmail({
      to: alumniRecord.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { alumniId: alumniRecord.id, institutionDomain },
    }).catch(err => console.error('[Alumni] Email send error (non-blocking):', err.message));

    console.log(`Alumni invited: ${alumniRecord.id} (${alumniRecord.email}) by ${alumniRecord.invitedBy}`);
    res.status(201).json({ data: alumniRecord });
  } catch (e) {
    console.error('Error inviting alumni:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * List alumni for the current educational admin's institution
 * GET /api/education/alumni
 *
 * Query params:
 *   - status: Filter by status ('invited', 'accepted', 'rejected')
 *   - search: Case-insensitive search across firstName, lastName, email
 *   - page: Page number (default 1)
 *   - perPage: Results per page (default 20, max 100)
 */
async function listAlumni(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account' });
    }

    const alumniList = loadAlumni();

    // Filter by institutionDomain
    let filtered = alumniList.filter(a => a.institutionDomain === institutionDomain);

    // Filter by status if provided
    const { status, search, page, perPage } = req.query;
    if (status && ['invited', 'accepted', 'rejected'].includes(status)) {
      filtered = filtered.filter(a => a.status === status);
    }

    // Search across firstName, lastName, email
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filtered = filtered.filter(a => {
        const first = (a.firstName || '').toLowerCase();
        const last = (a.lastName || '').toLowerCase();
        const emailStr = (a.email || '').toLowerCase();
        return first.includes(searchLower) || last.includes(searchLower) || emailStr.includes(searchLower);
      });
    }

    // Sort by invitedAt descending (newest first)
    filtered.sort((a, b) => new Date(b.invitedAt) - new Date(a.invitedAt));

    // Pagination
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPerPage = Math.min(Math.max(1, parseInt(perPage, 10) || 20), 100);
    const total = filtered.length;
    const totalPages = Math.ceil(total / parsedPerPage);
    const startIndex = (parsedPage - 1) * parsedPerPage;
    const paginated = filtered.slice(startIndex, startIndex + parsedPerPage);

    res.status(200).json({
      data: paginated,
      pagination: {
        page: parsedPage,
        perPage: parsedPerPage,
        total,
        totalPages,
      },
    });
  } catch (e) {
    console.error('Error listing alumni:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify an alumni invitation code
 * GET /api/education/alumni/verify-invitation/:code
 *
 * Public endpoint — no authentication required.
 * Returns limited alumni data (no invitedBy, no invitationCode).
 */
async function verifyInvitation(req, res) {
  try {
    const { code } = req.params;

    if (!code || typeof code !== 'string' || code.length < 10) {
      return res.status(400).json({ valid: false, error: 'Invalid invitation code format.' });
    }

    const alumniList = loadAlumni();
    const alumni = alumniList.find(a => a.invitationCode === code);

    if (!alumni) {
      return res.status(404).json({ valid: false, error: 'Invalid invitation code.' });
    }

    if (alumni.status === 'accepted') {
      return res.status(410).json({ valid: false, error: 'This invitation has already been accepted.' });
    }

    if (alumni.status === 'rejected') {
      return res.status(410).json({ valid: false, error: 'This invitation is no longer valid.' });
    }

    // Return limited alumni data — no invitedBy, no invitationCode
    res.status(200).json({
      data: {
        valid: true,
        alumni: {
          firstName: alumni.firstName,
          lastName: alumni.lastName,
          email: alumni.email,
          institutionDomain: alumni.institutionDomain,
          graduationYear: alumni.graduationYear,
          program: alumni.program,
        },
      },
    });
  } catch (e) {
    console.error('Error verifying alumni invitation:', e);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
}

/**
 * Accept an alumni invitation
 * POST /api/education/alumni/accept-invitation
 *
 * Requires authentication (the alumni user must have signed up first).
 * Body: { invitationCode: string, userId: string }
 */
async function acceptInvitation(req, res) {
  try {
    const { invitationCode, userId } = req.body;

    if (!invitationCode || !userId) {
      return res.status(400).json({ error: 'invitationCode and userId are required.' });
    }

    const alumniList = loadAlumni();
    const alumniIndex = alumniList.findIndex(a => a.invitationCode === invitationCode);

    if (alumniIndex === -1) {
      return res.status(404).json({ error: 'Invalid invitation code.' });
    }

    const alumni = alumniList[alumniIndex];

    if (alumni.status === 'accepted') {
      return res.status(409).json({ error: 'This invitation has already been accepted.' });
    }

    // Update the alumni record
    alumni.status = 'accepted';
    alumni.acceptedAt = new Date().toISOString();
    alumni.userId = sanitizeString(userId, { maxLength: 100 });
    alumniList[alumniIndex] = alumni;
    await saveAlumni(alumniList);

    // Send welcome email (non-blocking)
    const tenantBranding = await getTenantBranding(alumni.institutionDomain);
    const emailTemplate = alumniWelcome({
      firstName: alumni.firstName,
      lastName: alumni.lastName,
      institutionName: tenantBranding.marketplaceName || alumni.institutionDomain,
      branding: tenantBranding,
    });

    sendEmail({
      to: alumni.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { alumniId: alumni.id, institutionDomain: alumni.institutionDomain },
    }).catch(err => console.error('[Alumni] Welcome email send error (non-blocking):', err.message));

    console.log(`Alumni invitation accepted: ${alumni.id} (${alumni.email}) by user ${userId}`);
    res.status(200).json({ data: alumni });
  } catch (e) {
    console.error('Error accepting alumni invitation:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete an alumni record
 * DELETE /api/education/alumni/:id
 *
 * Auth: Educational admin only. Scoped by institutionDomain.
 */
async function deleteAlumni(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account' });
    }

    const { id } = req.params;
    const alumniList = loadAlumni();
    const alumniIndex = alumniList.findIndex(a => a.id === id);

    if (alumniIndex === -1) {
      return res.status(404).json({ error: 'Alumni record not found.' });
    }

    // Scope check: only allow deleting alumni from the admin's own institution
    if (alumniList[alumniIndex].institutionDomain !== institutionDomain) {
      return res.status(403).json({ error: 'You can only manage alumni from your own institution.' });
    }

    const removed = alumniList.splice(alumniIndex, 1)[0];
    await saveAlumni(alumniList);

    console.log(`Alumni deleted: ${removed.id} (${removed.email}) by ${user.id?.uuid}`);
    res.status(200).json({ data: null, message: `Alumni "${removed.id}" has been deleted.` });
  } catch (e) {
    console.error('Error deleting alumni:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Resend an alumni invitation (regenerate invitation code)
 * PUT /api/education/alumni/:id/resend
 *
 * Auth: Educational admin only. Scoped by institutionDomain.
 */
async function resendInvitation(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account' });
    }

    const { id } = req.params;
    const alumniList = loadAlumni();
    const alumniIndex = alumniList.findIndex(a => a.id === id);

    if (alumniIndex === -1) {
      return res.status(404).json({ error: 'Alumni record not found.' });
    }

    const alumni = alumniList[alumniIndex];

    // Scope check
    if (alumni.institutionDomain !== institutionDomain) {
      return res.status(403).json({ error: 'You can only manage alumni from your own institution.' });
    }

    if (alumni.status === 'accepted') {
      return res.status(400).json({ error: 'Cannot resend invitation for an already accepted alumni.' });
    }

    // Regenerate invitation code and update timestamp
    alumni.invitationCode = generateInvitationCode();
    alumni.invitedAt = new Date().toISOString();
    alumni.status = 'invited';
    alumniList[alumniIndex] = alumni;
    await saveAlumni(alumniList);

    // Send reminder email (non-blocking)
    const tenantBranding = await getTenantBranding(alumni.institutionDomain);
    const emailTemplate = alumniReminder({
      firstName: alumni.firstName,
      email: alumni.email,
      institutionName: tenantBranding.marketplaceName || alumni.institutionDomain,
      invitationCode: alumni.invitationCode,
      branding: tenantBranding,
    });

    sendEmail({
      to: alumni.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      templateName: emailTemplate.templateName,
      metadata: { alumniId: alumni.id, institutionDomain: alumni.institutionDomain },
    }).catch(err => console.error('[Alumni] Reminder email send error (non-blocking):', err.message));

    console.log(`Alumni invitation resent: ${alumni.id} (${alumni.email}) by ${user.id?.uuid}`);
    res.status(200).json({ data: alumni });
  } catch (e) {
    console.error('Error resending alumni invitation:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  invite: inviteAlumni,
  list: listAlumni,
  delete: deleteAlumni,
  resend: resendInvitation,
  verifyInvitation,
  acceptInvitation,
};
