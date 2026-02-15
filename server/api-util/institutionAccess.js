/**
 * Institution Access Middleware
 *
 * Validates that a student's institution is an active member of ProveGround
 * before allowing access to protected resources.
 */

const { getIntegrationSdk, handleError } = require('./sdk');
const { getInstitutionMemberships } = require('../api/admin/institutions');

/**
 * Check if an email domain belongs to an active member institution
 * @param {string} emailDomain - The email domain to check (e.g., 'harvard.edu')
 * @returns {Object} - { isActive, institution }
 */
function checkInstitutionAccess(emailDomain) {
  if (!emailDomain) {
    return { isActive: false, institution: null, reason: 'no_email_domain' };
  }

  const institutionMemberships = getInstitutionMemberships();
  const normalizedDomain = emailDomain.toLowerCase();
  const institution = institutionMemberships.get(normalizedDomain);

  if (!institution) {
    return {
      isActive: false,
      institution: null,
      reason: 'institution_not_found',
    };
  }

  const isActive = institution.membershipStatus === 'active';
  const now = new Date();
  const startDate = institution.membershipStartDate
    ? new Date(institution.membershipStartDate)
    : null;
  const endDate = institution.membershipEndDate ? new Date(institution.membershipEndDate) : null;

  const isWithinDates = (!startDate || now >= startDate) && (!endDate || now <= endDate);
  const hasActiveAccess = isActive && isWithinDates;

  if (!hasActiveAccess) {
    let reason = 'membership_inactive';
    if (!isActive) {
      reason = 'membership_inactive';
    } else if (startDate && now < startDate) {
      reason = 'membership_not_started';
    } else if (endDate && now > endDate) {
      reason = 'membership_expired';
    }

    return {
      isActive: false,
      institution,
      reason,
    };
  }

  return {
    isActive: true,
    institution,
    reason: null,
  };
}

/**
 * Express middleware to require active institution membership for students
 * Non-student users (corporate-partner, educational-admin, system-admin) are allowed through
 */
function requireInstitutionAccess(req, res, next) {
  return async function(req, res, next) {
    try {
      const sdk = await getIntegrationSdk(req);
      const currentUserRes = await sdk.currentUser.show();
      const currentUser = currentUserRes.data.data;
      const publicData = currentUser.attributes.profile.publicData || {};
      const userType = publicData.userType;

      // Only apply to students
      if (userType !== 'student') {
        return next();
      }

      const emailDomain = publicData.emailDomain?.toLowerCase();
      const accessResult = checkInstitutionAccess(emailDomain);

      if (!accessResult.isActive) {
        return res.status(403).json({
          error: 'Institution membership required',
          reason: accessResult.reason,
          institutionName: accessResult.institution?.name,
          message: getAccessDeniedMessage(accessResult.reason),
        });
      }

      // Attach institution info to request for use in downstream handlers
      req.institution = accessResult.institution;
      next();
    } catch (e) {
      handleError(res, e);
    }
  };
}

/**
 * Get a user-friendly message for access denied reasons
 */
function getAccessDeniedMessage(reason) {
  const messages = {
    no_email_domain:
      'Your account is missing email domain information. Please update your profile or contact support.',
    institution_not_found:
      'Your institution is not currently a member of ProveGround. Please contact your school administrator to request access.',
    membership_inactive:
      "Your institution's membership is not currently active. Please contact your school administrator.",
    membership_not_started:
      "Your institution's membership has not yet begun. Please check back later or contact your school administrator.",
    membership_expired:
      "Your institution's membership has expired. Please contact your school administrator to renew.",
  };

  return messages[reason] || 'Access denied. Please contact your school administrator.';
}

/**
 * Validate .edu email format during signup
 * Returns the email domain if valid, or null if invalid
 */
function validateEduEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, domain: null, error: 'Email is required' };
  }

  // Extract domain from email
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) {
    return { isValid: false, domain: null, error: 'Invalid email format' };
  }

  const domain = parts[1];

  // Check if it's a .edu domain (or other educational domains)
  const eduPatterns = [
    /\.edu$/, // US educational (.edu)
    /\.edu\.[a-z]{2}$/, // International educational (e.g., .edu.au)
    /\.ac\.[a-z]{2}$/, // UK/international academic (e.g., .ac.uk)
  ];

  const isEduEmail = eduPatterns.some(pattern => pattern.test(domain));

  if (!isEduEmail) {
    return {
      isValid: false,
      domain,
      error: 'Students must sign up with a valid educational email address (e.g., .edu)',
    };
  }

  return { isValid: true, domain, error: null };
}

module.exports = {
  checkInstitutionAccess,
  requireInstitutionAccess,
  validateEduEmail,
  getAccessDeniedMessage,
};
