/**
 * Educational Admin — Corporate Partner Management
 *
 * Allows educational admins on white-label tenants to approve, reject,
 * and remove corporate partners from their institution's marketplace.
 */

const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { getTenantById, updateTenant } = require('../api-util/tenantRegistry');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verify the current user is an educational admin.
 * Reuses pattern from server/api/education-messages.js
 */
async function verifyEducationalAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'educational-admin') {
    return null;
  }

  return {
    user: currentUser,
    institutionName: publicData.institutionName,
    institutionDomain: publicData.institutionDomain || publicData.emailDomain,
  };
}

/**
 * GET /api/education/partners
 *
 * List corporate partners visible to this tenant.
 * Returns both associated (approved) partners and pending ones.
 */
async function list(req, res) {
  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Query all corporate partners in this tenant's Sharetribe account
    const partnersResponse = await integrationSdk.users.query({
      pub_userType: 'corporate-partner',
      'fields.user': ['profile.displayName', 'profile.publicData'],
      perPage: 100,
    });

    const partners = partnersResponse.data.data;
    const tenantPartnerIds = req.tenant?.corporatePartnerIds || [];

    const partnerList = partners.map(partner => {
      const pd = partner.attributes.profile.publicData || {};
      return {
        id: partner.id.uuid,
        displayName: partner.attributes.profile.displayName,
        companyName: pd.companyName,
        industry: pd.industry,
        companySize: pd.companySize,
        approvalStatus: pd.approvalStatus || null,
        approvedAt: pd.approvedAt || null,
        isAssociated: tenantPartnerIds.includes(partner.id.uuid),
      };
    });

    res.status(200).json({
      partners: partnerList,
      total: partnerList.length,
      institutionName: adminInfo.institutionName,
    });
  } catch (error) {
    console.error('Education list partners error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/education/partners/:userId/approve
 *
 * Approve a corporate partner and add them to this tenant.
 */
async function approve(req, res) {
  const { userId } = req.params;

  if (!userId || !UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    // Must be on a white-label tenant
    if (!req.tenant || req.tenant.id === 'default') {
      return res.status(403).json({
        error: 'Partner management is only available on institution tenants.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Verify the target is a corporate partner
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;
    const userType = user.attributes.profile.publicData?.userType;

    if (userType !== 'corporate-partner') {
      return res.status(400).json({
        error: 'Only corporate partner profiles can be managed through this endpoint.',
      });
    }

    // Update approval status
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminInfo.user.id.uuid,
        approvedByType: 'educational-admin',
      },
    });

    // Auto-add to tenant's corporatePartnerIds
    const tenant = getTenantById(req.tenant.id);
    if (tenant && !tenant.corporatePartnerIds.includes(userId)) {
      const updatedPartners = [...tenant.corporatePartnerIds, userId];
      updateTenant(req.tenant.id, { corporatePartnerIds: updatedPartners });
    }

    res.status(200).json({
      success: true,
      message: 'Corporate partner approved and added to your institution.',
      user: { id: userId, approvalStatus: 'approved' },
    });
  } catch (error) {
    console.error('Education approve partner error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/education/partners/:userId/reject
 *
 * Reject a corporate partner and remove them from this tenant.
 * Body: { reason?: string }
 */
async function reject(req, res) {
  const { userId } = req.params;
  const { reason } = req.body || {};

  if (!userId || !UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    if (!req.tenant || req.tenant.id === 'default') {
      return res.status(403).json({
        error: 'Partner management is only available on institution tenants.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Verify the target is a corporate partner
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;
    const userType = user.attributes.profile.publicData?.userType;

    if (userType !== 'corporate-partner') {
      return res.status(400).json({
        error: 'Only corporate partner profiles can be managed through this endpoint.',
      });
    }

    // Update approval status
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        approvalStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: adminInfo.user.id.uuid,
        rejectionReason: reason || null,
      },
    });

    // Remove from tenant's corporatePartnerIds
    const tenant = getTenantById(req.tenant.id);
    if (tenant && tenant.corporatePartnerIds.includes(userId)) {
      const updatedPartners = tenant.corporatePartnerIds.filter(p => p !== userId);
      updateTenant(req.tenant.id, { corporatePartnerIds: updatedPartners });
    }

    res.status(200).json({
      success: true,
      message: 'Corporate partner rejected.',
      user: { id: userId, approvalStatus: 'rejected' },
    });
  } catch (error) {
    console.error('Education reject partner error:', error);
    handleError(res, error);
  }
}

/**
 * DELETE /api/education/partners/:userId
 *
 * Remove an approved partner from this tenant (revokes approval).
 */
async function remove(req, res) {
  const { userId } = req.params;

  if (!userId || !UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    if (!req.tenant || req.tenant.id === 'default') {
      return res.status(403).json({
        error: 'Partner management is only available on institution tenants.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Verify the target is a corporate partner
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;
    const userType = user.attributes.profile.publicData?.userType;

    if (userType !== 'corporate-partner') {
      return res.status(400).json({
        error: 'Only corporate partner profiles can be managed through this endpoint.',
      });
    }

    // Revoke approval — set back to pending
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        approvalStatus: 'pending',
        approvedAt: null,
        approvedBy: null,
        approvedByType: null,
      },
    });

    // Remove from tenant's corporatePartnerIds
    const tenant = getTenantById(req.tenant.id);
    if (tenant && tenant.corporatePartnerIds.includes(userId)) {
      const updatedPartners = tenant.corporatePartnerIds.filter(p => p !== userId);
      updateTenant(req.tenant.id, { corporatePartnerIds: updatedPartners });
    }

    res.status(200).json({
      success: true,
      message: 'Corporate partner removed from your institution.',
      user: { id: userId, approvalStatus: 'pending' },
    });
  } catch (error) {
    console.error('Education remove partner error:', error);
    handleError(res, error);
  }
}

module.exports = { list, approve, reject, remove };
