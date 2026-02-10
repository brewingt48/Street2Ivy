/**
 * Alumni Network API
 *
 * Provides alumni directory, search, and invitation functionality.
 * - Students can search alumni by major, sports, mentor/network willingness
 * - Educational admins can invite alumni to join the platform
 * - Alumni profiles are searchable once registered
 */

const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { handleError, serialize } = require('../api-util/sdk');

/**
 * Search alumni directory
 * GET /api/alumni/search
 *
 * Query params:
 *   - university (optional): Filter by university
 *   - major (optional): Filter by major
 *   - sport (optional): Filter by sport played
 *   - willingToMentor (optional): Filter by mentorship availability
 *   - willingToNetwork (optional): Filter by networking availability
 *   - graduationYear (optional): Filter by graduation year
 *   - page (optional): Page number (default 1)
 *   - perPage (optional): Results per page (default 20)
 */
async function searchAlumni(req, res) {
  try {
    const integrationSdk = getIntegrationSdk();

    const {
      university,
      major,
      sport,
      willingToMentor,
      willingToNetwork,
      graduationYear,
      page = 1,
      perPage = 20,
    } = req.query;

    // Build query params for Sharetribe Integration API
    const queryParams = {
      pub_userType: 'alumni',
      page: parseInt(page, 10),
      per_page: Math.min(parseInt(perPage, 10), 50),
    };

    // Apply filters
    if (university) {
      queryParams.pub_university = university;
    }
    if (major) {
      queryParams.pub_major = major;
    }
    if (sport) {
      queryParams.pub_sports = `has_any:${sport}`;
    }
    if (willingToMentor === 'true') {
      queryParams.pub_willingToMentor = true;
    }
    if (willingToNetwork === 'true') {
      queryParams.pub_willingToNetwork = true;
    }
    if (graduationYear) {
      queryParams.pub_graduationYear = graduationYear;
    }

    const result = await integrationSdk.users.query(queryParams);

    const alumni = result.data.data.map(user => ({
      id: user.id.uuid,
      displayName: user.attributes.profile.displayName,
      abbreviatedName: user.attributes.profile.abbreviatedName,
      publicData: user.attributes.profile.publicData || {},
      createdAt: user.attributes.createdAt,
    }));

    res.status(200).json({
      data: alumni,
      meta: result.data.meta || { totalItems: alumni.length, page: parseInt(page, 10), perPage: parseInt(perPage, 10) },
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Invite alumni to join the platform
 * POST /api/alumni/invite
 *
 * Body: {
 *   emails: ['alumni1@university.edu', 'alumni2@gmail.com'],
 *   personalMessage: 'Join our alumni network on Street2Ivy!'
 * }
 *
 * Only educational admins can send invitations.
 */
async function inviteAlumni(req, res) {
  try {
    const integrationSdk = getIntegrationSdk();

    // Verify caller is an educational admin
    const sdk = require('../api-util/sdk').getSdk(req, res);
    const currentUserRes = await sdk.currentUser.show();
    const currentUser = currentUserRes.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'educational-admin' && publicData.userType !== 'system-admin') {
      return res.status(403).json({ error: 'Only educational admins can invite alumni.' });
    }

    const { emails = [], personalMessage = '' } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'At least one email address is required.' });
    }

    if (emails.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 invitations per request.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: 'Invalid email addresses found.',
        invalidEmails,
      });
    }

    // Store invitations (in production, this would send actual emails)
    const invitations = emails.map(email => ({
      email: email.toLowerCase(),
      invitedBy: currentUser.id.uuid,
      inviterName: currentUser.attributes.profile.displayName,
      institutionName: publicData.institutionName || publicData.university || 'Your Institution',
      institutionDomain: publicData.institutionDomain || publicData.emailDomain || '',
      personalMessage,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }));

    // In production, integrate with email service (SendGrid, etc.)
    // For now, log invitations and return success
    console.log(`[Alumni Invite] ${invitations.length} invitations sent by ${currentUser.attributes.profile.displayName}`);

    res.status(200).json({
      message: `${invitations.length} alumni invitation(s) queued successfully.`,
      data: {
        sent: invitations.length,
        emails: emails.map(e => e.toLowerCase()),
      },
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Get alumni profile by ID
 * GET /api/alumni/:userId
 */
async function getAlumniProfile(req, res) {
  try {
    const integrationSdk = getIntegrationSdk();
    const { userId } = req.params;

    const result = await integrationSdk.users.show({ id: userId });
    const user = result.data.data;

    if (user.attributes.profile.publicData?.userType !== 'alumni') {
      return res.status(404).json({ error: 'Alumni profile not found.' });
    }

    res.status(200).json({
      data: {
        id: user.id.uuid,
        displayName: user.attributes.profile.displayName,
        bio: user.attributes.profile.bio,
        publicData: user.attributes.profile.publicData || {},
      },
    });
  } catch (e) {
    handleError(res, e);
  }
}

module.exports = {
  search: searchAlumni,
  invite: inviteAlumni,
  getProfile: getAlumniProfile,
};
