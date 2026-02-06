const { getIntegrationSdk } = require('../../api-util/integrationSdk');
const { getSdk, handleError } = require('../../api-util/sdk');

// Security: UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verify the current user is a system admin
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
 * GET /api/admin/users
 *
 * List all users with optional filters.
 *
 * Query params:
 *   userType     - Filter by user type (student, corporate-partner, educational-admin)
 *   search       - Search by name or email domain
 *   status       - Filter by status (active, banned, deleted)
 *   institution  - Filter by institution domain
 *   page         - Pagination page (default: 1)
 *   perPage      - Results per page (default: 20, max: 100)
 */
async function listUsers(req, res) {
  const { userType, search, status, institution, page = '1', perPage = '20' } = req.query;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Build query params
    const queryParams = {
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      page: parseInt(page, 10),
      perPage: Math.min(parseInt(perPage, 10) || 20, 100),
    };

    // Add filters
    if (userType) {
      queryParams.pub_userType = userType;
    }

    if (institution) {
      queryParams.pub_emailDomain = institution.toLowerCase();
    }

    // Note: Integration API search capabilities may be limited
    // For now, we'll fetch and filter client-side for search

    const usersResponse = await integrationSdk.users.query(queryParams);
    const { data: usersData, included = [], meta } = usersResponse.data;

    // Build image map
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Filter by status if specified
    let filteredUsers = usersData;
    if (status === 'banned') {
      filteredUsers = usersData.filter(u => u.attributes.banned);
    } else if (status === 'deleted') {
      filteredUsers = usersData.filter(u => u.attributes.deleted);
    } else if (status === 'active') {
      filteredUsers = usersData.filter(u => !u.attributes.banned && !u.attributes.deleted);
    }

    // Filter by search term if specified
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => {
        const displayName = u.attributes.profile.displayName?.toLowerCase() || '';
        const emailDomain = u.attributes.profile.publicData?.emailDomain?.toLowerCase() || '';
        const institutionName =
          u.attributes.profile.publicData?.institutionName?.toLowerCase() || '';
        const companyName = u.attributes.profile.publicData?.companyName?.toLowerCase() || '';

        return (
          displayName.includes(searchLower) ||
          emailDomain.includes(searchLower) ||
          institutionName.includes(searchLower) ||
          companyName.includes(searchLower)
        );
      });
    }

    // Transform users for frontend
    const users = filteredUsers.map(user => {
      const profileImageRef = user.relationships?.profileImage?.data;
      const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;
      const userPublicData = user.attributes.profile.publicData || {};

      return {
        id: user.id.uuid,
        type: user.type,
        attributes: {
          banned: user.attributes.banned,
          deleted: user.attributes.deleted,
          createdAt: user.attributes.createdAt,
          email: user.attributes.email, // Only available via Integration API
          profile: {
            displayName: user.attributes.profile.displayName,
            abbreviatedName: user.attributes.profile.abbreviatedName,
            publicData: {
              userType: userPublicData.userType,
              emailDomain: userPublicData.emailDomain,
              university: userPublicData.university,
              companyName: userPublicData.companyName,
              institutionName: userPublicData.institutionName,
            },
          },
        },
        profileImage: profileImage
          ? {
              id: profileImage.id.uuid,
              attributes: profileImage.attributes,
            }
          : null,
      };
    });

    res.status(200).json({
      users,
      pagination: {
        totalItems: meta.totalItems,
        totalPages: meta.totalPages,
        page: meta.page,
        perPage: meta.perPage,
      },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/users/:userId/block
 *
 * Block a user account.
 */
async function blockUser(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    // Prevent blocking yourself
    if (userId === admin.id.uuid) {
      return res.status(400).json({
        error: 'Cannot block your own account.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Update user to set banned: true
    const updateResponse = await integrationSdk.users.updateProfile({
      id: userId,
      banned: true,
    });

    res.status(200).json({
      success: true,
      message: 'User has been blocked.',
      user: {
        id: userId,
        banned: true,
      },
    });
  } catch (error) {
    console.error('Admin block user error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/users/:userId/unblock
 *
 * Unblock a user account.
 */
async function unblockUser(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Update user to set banned: false
    const updateResponse = await integrationSdk.users.updateProfile({
      id: userId,
      banned: false,
    });

    res.status(200).json({
      success: true,
      message: 'User has been unblocked.',
      user: {
        id: userId,
        banned: false,
      },
    });
  } catch (error) {
    console.error('Admin unblock user error:', error);
    handleError(res, error);
  }
}

/**
 * DELETE /api/admin/users/:userId
 *
 * Delete a user account.
 * Note: Sharetribe doesn't support direct user deletion via API.
 * Instead, we ban the user and update their profile to mark them as deleted.
 * This is a "soft delete" approach that prevents the user from logging in.
 */
async function deleteUser(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    // Prevent deleting yourself
    if (userId === admin.id.uuid) {
      return res.status(400).json({
        error: 'Cannot delete your own account.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Sharetribe doesn't have a users.delete endpoint.
    // Instead, we ban the user to prevent login and mark them as deleted in their profile.
    // First, ban the user
    await integrationSdk.users.updateProfile(
      {
        id: userId,
        publicData: {
          accountDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: admin.id.uuid,
        },
      },
      { expand: true }
    );

    // Then ban the user to prevent login
    await integrationSdk.users.ban({
      id: userId,
    });

    res.status(200).json({
      success: true,
      message: 'User account has been deactivated and banned.',
      user: {
        id: userId,
        deleted: true,
        banned: true,
      },
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/users/:userId/approve
 *
 * Approve a corporate partner or educational admin profile.
 */
async function approveUser(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // First get the user to verify they need approval
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;
    const userType = user.attributes.profile.publicData?.userType;

    if (!['corporate-partner', 'educational-admin'].includes(userType)) {
      return res.status(400).json({
        error: 'Only corporate partner and educational admin profiles require approval.',
      });
    }

    // Update the user's publicData to set approvalStatus = 'approved'
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: admin.id.uuid,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile has been approved.',
      user: {
        id: userId,
        approvalStatus: 'approved',
      },
    });
  } catch (error) {
    console.error('Admin approve user error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/users/:userId/reject
 *
 * Reject a corporate partner or educational admin profile.
 */
async function rejectUser(req, res) {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // First get the user to verify they need approval
    const userResponse = await integrationSdk.users.show({ id: userId });
    const user = userResponse.data.data;
    const userType = user.attributes.profile.publicData?.userType;

    if (!['corporate-partner', 'educational-admin'].includes(userType)) {
      return res.status(400).json({
        error: 'Only corporate partner and educational admin profiles require approval.',
      });
    }

    // Update the user's publicData to set approvalStatus = 'rejected'
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        approvalStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: admin.id.uuid,
        rejectionReason: reason || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile has been rejected.',
      user: {
        id: userId,
        approvalStatus: 'rejected',
      },
    });
  } catch (error) {
    console.error('Admin reject user error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/users/pending
 *
 * Get all users with pending approval status.
 */
async function getPendingApprovals(req, res) {
  const { page = '1', perPage = '20' } = req.query;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Query corporate partners and educational admins
    const [corporateResponse, eduAdminResponse] = await Promise.all([
      integrationSdk.users.query({
        pub_userType: 'corporate-partner',
        pub_approvalStatus: 'pending',
        include: ['profileImage'],
        'fields.image': ['variants.square-small'],
        perPage: 50,
      }),
      integrationSdk.users.query({
        pub_userType: 'educational-admin',
        pub_approvalStatus: 'pending',
        include: ['profileImage'],
        'fields.image': ['variants.square-small'],
        perPage: 50,
      }),
    ]);

    // Also get users without any approvalStatus (new signups before the field was added)
    const [corporateNoStatus, eduAdminNoStatus] = await Promise.all([
      integrationSdk.users.query({
        pub_userType: 'corporate-partner',
        include: ['profileImage'],
        'fields.image': ['variants.square-small'],
        perPage: 50,
      }),
      integrationSdk.users.query({
        pub_userType: 'educational-admin',
        include: ['profileImage'],
        'fields.image': ['variants.square-small'],
        perPage: 50,
      }),
    ]);

    // Combine and filter to get pending users
    const allCorporate = [...corporateResponse.data.data, ...corporateNoStatus.data.data];
    const allEduAdmin = [...eduAdminResponse.data.data, ...eduAdminNoStatus.data.data];
    const allIncluded = [
      ...(corporateResponse.data.included || []),
      ...(eduAdminResponse.data.included || []),
      ...(corporateNoStatus.data.included || []),
      ...(eduAdminNoStatus.data.included || []),
    ];

    // Deduplicate by ID
    const userMap = new Map();
    [...allCorporate, ...allEduAdmin].forEach(user => {
      const approvalStatus = user.attributes.profile.publicData?.approvalStatus;
      // Include users with pending status OR no status (new signups)
      if (!approvalStatus || approvalStatus === 'pending') {
        userMap.set(user.id.uuid, user);
      }
    });

    // Build image map
    const imageMap = {};
    allIncluded.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    const pendingUsers = Array.from(userMap.values()).map(user => {
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
            bio: user.attributes.profile.bio,
            publicData: {
              userType: publicData.userType,
              companyName: publicData.companyName,
              industry: publicData.industry,
              companySize: publicData.companySize,
              institutionName: publicData.institutionName,
              adminRole: publicData.adminRole,
              approvalStatus: publicData.approvalStatus || 'pending',
            },
          },
        },
        profileImage: profileImage
          ? {
              id: profileImage.id.uuid,
              attributes: profileImage.attributes,
            }
          : null,
      };
    });

    // Sort by creation date (newest first)
    pendingUsers.sort(
      (a, b) => new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt)
    );

    res.status(200).json({
      users: pendingUsers,
      pagination: {
        totalItems: pendingUsers.length,
        totalPages: 1,
        page: 1,
        perPage: pendingUsers.length,
      },
    });
  } catch (error) {
    console.error('Admin get pending approvals error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/users/:userId
 *
 * Get detailed information about a specific user.
 */
async function getUser(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    const userResponse = await integrationSdk.users.show({
      id: userId,
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x', 'variants.default'],
    });

    const user = userResponse.data.data;
    const included = userResponse.data.included || [];

    // Get profile image
    const profileImageRef = user.relationships?.profileImage?.data;
    const profileImage = profileImageRef
      ? included.find(i => i.id.uuid === profileImageRef.id.uuid)
      : null;

    res.status(200).json({
      user: {
        id: user.id.uuid,
        type: user.type,
        attributes: {
          banned: user.attributes.banned,
          deleted: user.attributes.deleted,
          createdAt: user.attributes.createdAt,
          email: user.attributes.email,
          emailVerified: user.attributes.emailVerified,
          profile: user.attributes.profile,
        },
        profileImage: profileImage
          ? {
              id: profileImage.id.uuid,
              attributes: profileImage.attributes,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/users/create-admin
 *
 * Promote an existing user to admin (educational-admin or system-admin).
 * Note: Sharetribe Integration API doesn't support creating users directly.
 * Users must first sign up through the normal flow, then be promoted.
 *
 * Only system admins can promote users to admin accounts.
 */
async function createAdmin(req, res) {
  const { email, userType, institutionName, adminRole } = req.body;

  // Validate required fields
  if (!email || !userType) {
    return res.status(400).json({
      error: 'Missing required fields: email, userType',
    });
  }

  // Only allow admin user types
  if (!['educational-admin', 'system-admin'].includes(userType)) {
    return res.status(400).json({
      error: 'Invalid user type. Must be educational-admin or system-admin.',
    });
  }

  // Educational admins require institutionName
  if (userType === 'educational-admin' && !institutionName) {
    return res.status(400).json({
      error: 'Educational admins require an institution name.',
    });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Find the user by email
    const usersResponse = await integrationSdk.users.query({
      email: email.toLowerCase(),
    });

    const users = usersResponse.data.data;

    if (users.length === 0) {
      return res.status(404).json({
        error: `No user found with email "${email}". The user must sign up first before being promoted to admin.`,
      });
    }

    const user = users[0];
    const userId = user.id.uuid;
    const currentPublicData = user.attributes.profile.publicData || {};

    // Check if already the same type
    if (currentPublicData.userType === userType) {
      return res.status(400).json({
        error: `This user is already a ${userType}.`,
      });
    }

    // Extract email domain for institution matching
    const emailDomain = email.split('@')[1]?.toLowerCase();

    // Prepare publicData based on user type
    const publicData = {
      ...currentPublicData,
      userType,
      emailDomain,
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: admin.id.uuid,
    };

    if (userType === 'educational-admin') {
      publicData.institutionName = institutionName;
      publicData.institutionDomain = emailDomain;
      if (adminRole) {
        publicData.adminRole = adminRole;
      }
    }

    // Update the user's profile to promote them
    await integrationSdk.users.updateProfile({
      id: userId,
      publicData,
      protectedData: {
        promotedByAdmin: admin.id.uuid,
        promotedAt: new Date().toISOString(),
      },
    });

    res.status(200).json({
      success: true,
      message: `User promoted to ${
        userType === 'system-admin' ? 'System Administrator' : 'Educational Administrator'
      } successfully.`,
      user: {
        id: userId,
        email,
        displayName: user.attributes.profile.displayName,
        userType,
        institutionName: userType === 'educational-admin' ? institutionName : undefined,
      },
    });
  } catch (error) {
    console.error('Admin promote user error:', error);
    handleError(res, error);
  }
}

module.exports = {
  list: listUsers,
  get: getUser,
  block: blockUser,
  unblock: unblockUser,
  delete: deleteUser,
  approve: approveUser,
  reject: rejectUser,
  pending: getPendingApprovals,
  createAdmin,
};
