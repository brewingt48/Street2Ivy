/**
 * Educational Admin Application API
 *
 * Handles applications from university career services staff
 * who want to become educational administrators on Street2Ivy.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../api-util/db');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { handleError } = require('../api-util/sdk');

/**
 * POST /api/educational-admin/apply
 *
 * Submit an application to become an educational administrator.
 * This is a public endpoint - no authentication required.
 */
async function submitApplication(req, res) {
  const {
    firstName,
    lastName,
    email,
    institutionName,
    institutionWebsite,
    jobTitle,
    department,
    workPhone,
    reason,
    studentCount,
    agreeToTerms,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !institutionName || !jobTitle || !department || !reason || !agreeToTerms) {
    return res.status(400).json({
      error: 'Missing required fields. Please fill out all required fields.',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.',
    });
  }

  // Extract email domain
  const emailDomain = email.split('@')[1]?.toLowerCase();

  // Check for duplicate applications
  const existingApplication = db.eduAdminApplications.getByEmail(email.toLowerCase());

  if (existingApplication) {
    return res.status(409).json({
      error: 'An application with this email address has already been submitted. We will contact you soon.',
    });
  }

  try {
    // Check if user already exists in the system
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    const usersResponse = await integrationSdk.users.query({
      email: email.toLowerCase(),
    });

    const existingUser = usersResponse.data.data[0];
    let userId = null;

    if (existingUser) {
      userId = existingUser.id.uuid;
      const publicData = existingUser.attributes.profile.publicData || {};

      // Check if already an educational admin
      if (publicData.userType === 'educational-admin') {
        return res.status(400).json({
          error: 'This email is already registered as an Educational Administrator. Please log in to access your dashboard.',
        });
      }
    }

    // Create application record
    const application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      email: email.toLowerCase(),
      emailDomain,
      institutionName,
      institutionWebsite,
      jobTitle,
      department,
      workPhone: workPhone || null,
      reason,
      studentCount,
      existingUserId: userId,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
    };

    db.eduAdminApplications.create(application);

    console.log('Educational Admin Application received:', {
      id: application.id,
      email: application.email,
      institution: application.institutionName,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. We will review your application and contact you within 2-3 business days.',
      applicationId: application.id,
    });
  } catch (error) {
    console.error('Educational admin application error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/educational-admin-applications
 *
 * List all educational admin applications (system admin only).
 */
async function listApplications(req, res) {
  const { status, page = '1', perPage = '20' } = req.query;

  try {
    // Fetch all applications from SQLite
    let allApplications = db.eduAdminApplications.getAll();

    // Filter by status if specified
    if (status) {
      allApplications = allApplications.filter(app => app.status === status);
    }

    // Sort by submission date (newest first) - already sorted by DB, but ensure
    allApplications.sort((a, b) =>
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    // Paginate
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const paginatedApplications = allApplications.slice(startIndex, startIndex + perPageNum);

    res.status(200).json({
      applications: paginatedApplications,
      pagination: {
        totalItems: allApplications.length,
        totalPages: Math.ceil(allApplications.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
    });
  } catch (error) {
    console.error('List applications error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/educational-admin-applications/:id/approve
 *
 * Approve an educational admin application and promote the user.
 */
async function approveApplication(req, res) {
  const { id } = req.params;

  try {
    const application = db.eduAdminApplications.getById(id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application has already been ${application.status}.` });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Find the user by email
    const usersResponse = await integrationSdk.users.query({
      email: application.email,
    });

    let userId;

    if (usersResponse.data.data.length === 0) {
      // User hasn't signed up yet - mark as approved pending signup
      db.eduAdminApplications.update(id, {
        status: 'approved-pending-signup',
        reviewedAt: new Date().toISOString(),
      });

      const updated = db.eduAdminApplications.getById(id);

      return res.status(200).json({
        success: true,
        message: 'Application approved. The user will be promoted to Educational Administrator when they sign up.',
        application: {
          id: updated.id,
          status: updated.status,
          email: updated.email,
          institutionName: updated.institutionName,
        },
      });
    }

    const user = usersResponse.data.data[0];
    userId = user.id.uuid;
    const currentPublicData = user.attributes.profile.publicData || {};
    const emailDomain = application.email.split('@')[1]?.toLowerCase();

    // Promote user to educational admin
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        ...currentPublicData,
        userType: 'educational-admin',
        emailDomain,
        institutionName: application.institutionName,
        institutionDomain: emailDomain,
        adminRole: application.department,
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        applicationId: application.id,
      },
    });

    // Update application status
    db.eduAdminApplications.update(id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
    });

    const updated = db.eduAdminApplications.getById(id);

    res.status(200).json({
      success: true,
      message: 'Application approved. User has been promoted to Educational Administrator.',
      application: {
        id: updated.id,
        status: updated.status,
        email: updated.email,
        institutionName: updated.institutionName,
      },
    });
  } catch (error) {
    console.error('Approve application error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/educational-admin-applications/:id/reject
 *
 * Reject an educational admin application.
 */
async function rejectApplication(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const application = db.eduAdminApplications.getById(id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application has already been ${application.status}.` });
    }

    // Update application status
    db.eduAdminApplications.update(id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      notes: reason || null,
    });

    const updated = db.eduAdminApplications.getById(id);

    res.status(200).json({
      success: true,
      message: 'Application has been rejected.',
      application: {
        id: updated.id,
        status: updated.status,
        email: updated.email,
      },
    });
  } catch (error) {
    console.error('Reject application error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/educational-admin-applications/stats
 *
 * Get application statistics.
 */
async function getApplicationStats(req, res) {
  try {
    const allApplications = db.eduAdminApplications.getAll();

    const stats = {
      total: allApplications.length,
      pending: allApplications.filter(a => a.status === 'pending').length,
      approved: allApplications.filter(a => a.status === 'approved').length,
      approvedPendingSignup: allApplications.filter(a => a.status === 'approved-pending-signup').length,
      rejected: allApplications.filter(a => a.status === 'rejected').length,
    };

    res.status(200).json({ stats });
  } catch (error) {
    console.error('Get application stats error:', error);
    handleError(res, error);
  }
}

/**
 * PUT /api/admin/educational-admins/:userId/subscription
 *
 * Update subscription status for an educational admin (deposit paid, AI coaching).
 */
async function updateSubscription(req, res) {
  const { userId } = req.params;
  const { depositPaid, aiCoachingApproved } = req.body;

  try {
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Get current user data
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentPublicData = user.attributes.profile.publicData || {};

    // Verify user is an educational admin
    if (currentPublicData.userType !== 'educational-admin') {
      return res.status(400).json({ error: 'User is not an educational administrator.' });
    }

    // Build updated publicData
    const newPublicData = { ...currentPublicData };

    // Update deposit status
    if (depositPaid !== undefined) {
      newPublicData.depositPaid = depositPaid;
      if (depositPaid && !currentPublicData.depositPaidDate) {
        newPublicData.depositPaidDate = new Date().toISOString();
      } else if (!depositPaid) {
        newPublicData.depositPaidDate = null;
      }
    }

    // Update AI coaching status
    if (aiCoachingApproved !== undefined) {
      newPublicData.aiCoachingApproved = aiCoachingApproved;
      if (aiCoachingApproved && !currentPublicData.aiCoachingApprovedDate) {
        newPublicData.aiCoachingApprovedDate = new Date().toISOString();
      } else if (!aiCoachingApproved) {
        newPublicData.aiCoachingApprovedDate = null;
      }
    }

    // Update user profile
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: newPublicData,
    });

    res.status(200).json({
      success: true,
      message: 'Subscription status updated successfully.',
      user: {
        id: userId,
        institutionName: newPublicData.institutionName,
        depositPaid: newPublicData.depositPaid,
        depositPaidDate: newPublicData.depositPaidDate,
        aiCoachingApproved: newPublicData.aiCoachingApproved,
        aiCoachingApprovedDate: newPublicData.aiCoachingApprovedDate,
      },
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/educational-admins
 *
 * List all educational administrators with their subscription status.
 */
async function listEducationalAdmins(req, res) {
  const { page = '1', perPage = '20' } = req.query;

  try {
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    const usersResponse = await integrationSdk.users.query({
      pub_userType: 'educational-admin',
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      page: parseInt(page, 10),
      perPage: Math.min(parseInt(perPage, 10) || 20, 100),
    });

    const { data: usersData, included = [], meta } = usersResponse.data;

    // Build image map
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform users
    const admins = usersData.map(user => {
      const profileImageRef = user.relationships?.profileImage?.data;
      const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;
      const publicData = user.attributes.profile.publicData || {};

      return {
        id: user.id.uuid,
        type: user.type,
        attributes: {
          banned: user.attributes.banned,
          deleted: user.attributes.deleted,
          createdAt: user.attributes.createdAt,
          email: user.attributes.email,
          profile: {
            displayName: user.attributes.profile.displayName,
            abbreviatedName: user.attributes.profile.abbreviatedName,
            publicData: {
              institutionName: publicData.institutionName,
              institutionDomain: publicData.institutionDomain,
              adminRole: publicData.adminRole,
              depositPaid: publicData.depositPaid || false,
              depositPaidDate: publicData.depositPaidDate || null,
              aiCoachingApproved: publicData.aiCoachingApproved || false,
              aiCoachingApprovedDate: publicData.aiCoachingApprovedDate || null,
            },
          },
        },
        profileImage: profileImage
          ? {
              id: profileImage.id.uuid,
              type: profileImage.type,
              attributes: profileImage.attributes,
            }
          : null,
      };
    });

    res.status(200).json({
      admins,
      pagination: {
        totalItems: meta.totalItems,
        totalPages: meta.totalPages,
        page: meta.page,
        perPage: meta.perPage,
      },
    });
  } catch (error) {
    console.error('List educational admins error:', error);
    handleError(res, error);
  }
}

module.exports = {
  submit: submitApplication,
  list: listApplications,
  approve: approveApplication,
  reject: rejectApplication,
  stats: getApplicationStats,
  updateSubscription,
  listEducationalAdmins,
};
