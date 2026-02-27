/**
 * Corporate Partner Approval Check
 *
 * Reusable utility that verifies a corporate partner's approval status
 * before allowing access to protected endpoints.
 */

const { getSdk } = require('./sdk');

/**
 * Verify the current user is an approved corporate partner.
 *
 * @param {object} req - Express request (must have req.tenant from tenantResolver)
 * @param {object} res - Express response
 * @returns {{ user, approvalStatus }} on success, or null if denied
 */
async function verifyCorporatePartnerApproved(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};
  const userType = publicData.userType;

  // Must be a corporate partner
  if (userType !== 'corporate-partner' && userType !== 'corporate') {
    return null;
  }

  // If the tenant explicitly disables corporate approval, allow all
  if (req.tenant?.features?.requireCorporateApproval === false) {
    return { user: currentUser, approvalStatus: publicData.approvalStatus || 'approved' };
  }

  const approvalStatus = publicData.approvalStatus;

  // Backward compatibility: legacy users without approvalStatus are grandfathered in
  if (!approvalStatus || approvalStatus === 'approved') {
    return { user: currentUser, approvalStatus: approvalStatus || 'approved' };
  }

  // Pending or rejected — deny access
  return null;
}

module.exports = { verifyCorporatePartnerApproved };
