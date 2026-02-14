/**
 * Tenant Management API (System Admin Only)
 *
 * CRUD operations for managing marketplace tenants.
 * Each tenant represents an institution with its own Sharetribe marketplace account.
 */

const crypto = require('crypto');
const marketplaceSdkLib = require('sharetribe-flex-sdk');
const { getSdk, handleError } = require('../../api-util/sdk');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../../api-util/tenantRegistry');
const { clearIntegrationSdkCache } = require('../../api-util/integrationSdk');

/**
 * Verify the current user is a system admin.
 */
async function verifySystemAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'system-admin') {
    return null;
  }

  return currentUser;
}

/**
 * Sanitize tenant data for API response (never expose secrets).
 */
function sanitizeTenant(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    subdomain: tenant.subdomain,
    name: tenant.name,
    displayName: tenant.displayName,
    status: tenant.status,
    sharetribe: {
      clientId: tenant.sharetribe?.clientId,
      // Never expose secrets in API responses
      hasClientSecret: !!tenant.sharetribe?.clientSecret,
      hasIntegrationCredentials: !!(
        tenant.sharetribe?.integrationClientId &&
        tenant.sharetribe?.integrationClientSecret
      ),
    },
    branding: tenant.branding,
    institutionDomain: tenant.institutionDomain,
    corporatePartnerIds: tenant.corporatePartnerIds,
    features: tenant.features,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}

/**
 * GET /api/admin/tenants
 */
async function list(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenants = getAllTenants().map(sanitizeTenant);

    res.status(200).json({ tenants });
  } catch (error) {
    console.error('List tenants error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/tenants/:id
 */
async function get(req, res) {
  const { id } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenant = getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    res.status(200).json({ tenant: sanitizeTenant(tenant) });
  } catch (error) {
    console.error('Get tenant error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/tenants
 */
async function create(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenant = createTenant(req.body);

    console.log('Tenant created:', {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully.',
      tenant: sanitizeTenant(tenant),
    });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Create tenant error:', error);
    handleError(res, error);
  }
}

/**
 * PUT /api/admin/tenants/:id
 */
async function update(req, res) {
  const { id } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenant = updateTenant(id, req.body);

    // Invalidate cached SDK instance if credentials changed
    if (req.body.sharetribe) {
      clearIntegrationSdkCache(id);
    }

    console.log('Tenant updated:', { id: tenant.id, name: tenant.name });

    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully.',
      tenant: sanitizeTenant(tenant),
    });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Update tenant error:', error);
    handleError(res, error);
  }
}

/**
 * DELETE /api/admin/tenants/:id
 */
async function remove(req, res) {
  const { id } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    deleteTenant(id);
    clearIntegrationSdkCache(id);

    console.log('Tenant deleted:', { id });

    res.status(200).json({
      success: true,
      message: 'Tenant deleted successfully.',
    });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Delete tenant error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/tenants/:id/partners
 *
 * Body: { partnerId: "uuid" }
 */
async function addPartner(req, res) {
  const { id } = req.params;
  const { partnerId } = req.body;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required.' });
    }

    const tenant = getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    if (tenant.corporatePartnerIds.includes(partnerId)) {
      return res.status(409).json({ error: 'Partner is already associated with this tenant.' });
    }

    const updatedPartners = [...tenant.corporatePartnerIds, partnerId];
    const updated = updateTenant(id, { corporatePartnerIds: updatedPartners });

    res.status(200).json({
      success: true,
      message: 'Corporate partner added to tenant.',
      tenant: sanitizeTenant(updated),
    });
  } catch (error) {
    console.error('Add partner error:', error);
    handleError(res, error);
  }
}

/**
 * DELETE /api/admin/tenants/:id/partners/:partnerId
 */
async function removePartner(req, res) {
  const { id, partnerId } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenant = getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    if (!tenant.corporatePartnerIds.includes(partnerId)) {
      return res.status(404).json({ error: 'Partner is not associated with this tenant.' });
    }

    const updatedPartners = tenant.corporatePartnerIds.filter(p => p !== partnerId);
    const updated = updateTenant(id, { corporatePartnerIds: updatedPartners });

    res.status(200).json({
      success: true,
      message: 'Corporate partner removed from tenant.',
      tenant: sanitizeTenant(updated),
    });
  } catch (error) {
    console.error('Remove partner error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/tenants/:id/activate
 */
async function activate(req, res) {
  const { id } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const tenant = updateTenant(id, { status: 'active' });

    res.status(200).json({
      success: true,
      message: 'Tenant activated.',
      tenant: sanitizeTenant(tenant),
    });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Activate tenant error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/tenants/:id/deactivate
 */
async function deactivate(req, res) {
  const { id } = req.params;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    if (id === 'default') {
      return res.status(400).json({ error: 'Cannot deactivate the default tenant.' });
    }

    const tenant = updateTenant(id, { status: 'inactive' });

    res.status(200).json({
      success: true,
      message: 'Tenant deactivated.',
      tenant: sanitizeTenant(tenant),
    });
  } catch (error) {
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Deactivate tenant error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/tenants/:id/create-admin
 *
 * Creates an educational admin user for a tenant using the Marketplace SDK.
 * Body: { email, firstName, lastName }
 * Returns the user email and a temporary password.
 */
async function createAdmin(req, res) {
  const { id } = req.params;
  const { email, firstName, lastName } = req.body;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        error: 'email, firstName, and lastName are required.',
      });
    }

    // Get tenant
    const tenant = getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    // Tenant must have a Sharetribe clientId to create users
    const tenantClientId = tenant.sharetribe?.clientId;
    if (!tenantClientId) {
      return res.status(400).json({
        error: 'Tenant does not have a Sharetribe Client ID configured.',
      });
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(12).toString('base64url') + '!A1';

    // Create a fresh Marketplace SDK instance for the tenant
    const tenantSdk = marketplaceSdkLib.createInstance({
      clientId: tenantClientId,
    });

    // Derive institution info from tenant
    const institutionDomain = tenant.institutionDomain || email.split('@')[1] || '';
    const institutionName = tenant.name || '';

    // Create the user via Marketplace SDK (the only way to programmatically create users)
    await tenantSdk.currentUser.create({
      email,
      password: tempPassword,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      publicData: {
        userType: 'educational-admin',
        emailDomain: institutionDomain,
        institutionName: institutionName,
        institutionDomain: institutionDomain,
        adminRole: 'career-services',
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
      },
    });

    // Logout the SDK session so it doesn't interfere with other operations
    try {
      await tenantSdk.logout();
    } catch (e) {
      /* ignore logout errors */
    }

    console.log('Tenant admin created:', {
      tenantId: id,
      email,
      name: `${firstName} ${lastName}`,
    });

    res.status(201).json({
      success: true,
      message: 'Educational admin created successfully.',
      user: {
        email,
        firstName,
        lastName,
        tempPassword,
      },
      tenant: sanitizeTenant(tenant),
    });
  } catch (error) {
    console.error('Create tenant admin error:', error);

    if (error.status === 409 || error.message?.includes('email-taken')) {
      return res.status(409).json({
        error: 'A user with this email already exists.',
      });
    }

    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    handleError(res, error);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  addPartner,
  removePartner,
  activate,
  deactivate,
  createAdmin,
};
