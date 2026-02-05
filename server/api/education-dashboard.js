const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/education/dashboard
 *
 * Educational Admin Dashboard API endpoint.
 * Returns stats and student list for the educational admin's institution.
 *
 * Privacy: Only returns students whose email domain matches the admin's institution domain.
 *
 * Query params:
 *   page     - Pagination page (default: 1)
 *   perPage  - Results per page (default: 20, max: 100)
 *
 * Returns:
 *   {
 *     stats: {
 *       totalStudents: number,
 *       projectsApplied: number,
 *       projectsAccepted: number,
 *       projectsDeclined: number,
 *       projectsCompleted: number,
 *       invitationsReceived: number
 *     },
 *     students: [...],
 *     pagination: {...}
 *   }
 */
module.exports = async (req, res) => {
  const { page = '1', perPage = '20' } = req.query;

  try {
    // Step 1: Get current user and verify they are an educational admin
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    if (userType !== 'educational-admin') {
      return res.status(403).json({
        error: 'Access denied. Only educational administrators can access this dashboard.',
      });
    }

    // Step 2: Get the institution domain for filtering
    const institutionDomain = publicData.institutionDomain;
    const institutionName = publicData.institutionName;

    if (!institutionDomain) {
      return res.status(400).json({
        error: 'Institution domain not configured. Please update your profile with a valid institutional email.',
      });
    }

    // Step 3: Query students from this institution using Integration API
    const integrationSdk = getIntegrationSdk();

    const studentsResponse = await integrationSdk.users.query({
      pub_userType: 'student',
      pub_emailDomain: institutionDomain.toLowerCase(),
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      page: parseInt(page, 10),
      perPage: Math.min(parseInt(perPage, 10) || 20, 100),
    });

    const { data: studentsData, included = [], meta } = studentsResponse.data;

    // Build image map for quick lookup
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform students for the frontend
    const students = studentsData.map(user => {
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
          profile: {
            displayName: user.attributes.profile.displayName,
            abbreviatedName: user.attributes.profile.abbreviatedName,
            bio: user.attributes.profile.bio,
            publicData: userPublicData,
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

    // Step 4: Get all student IDs for transaction queries
    // For stats, we need to query ALL students from the institution (not just paginated)
    let allStudentIds = [];
    let statsPage = 1;
    const statsPerPage = 100;
    let hasMoreStudents = true;

    while (hasMoreStudents) {
      const allStudentsResponse = await integrationSdk.users.query({
        pub_userType: 'student',
        pub_emailDomain: institutionDomain.toLowerCase(),
        page: statsPage,
        perPage: statsPerPage,
      });

      const pageStudents = allStudentsResponse.data.data;
      allStudentIds = allStudentIds.concat(pageStudents.map(s => s.id.uuid));

      if (pageStudents.length < statsPerPage) {
        hasMoreStudents = false;
      } else {
        statsPage++;
      }

      // Safety limit: don't query more than 1000 students for stats
      if (allStudentIds.length >= 1000) {
        hasMoreStudents = false;
      }
    }

    // Step 5: Query transactions for these students
    // Note: Integration API transactions.query supports filtering by customerId
    let stats = {
      totalStudents: meta.totalItems || allStudentIds.length,
      projectsApplied: 0,
      projectsAccepted: 0,
      projectsDeclined: 0,
      projectsCompleted: 0,
      invitationsReceived: 0,
    };

    // Query transactions for each student (batched for performance)
    // Using Integration API's transactions.query with customerId filter
    if (allStudentIds.length > 0) {
      try {
        // Query all transactions where the customer is one of our students
        // We'll need to aggregate across multiple queries if there are many students
        const transactionPromises = allStudentIds.slice(0, 50).map(async studentId => {
          try {
            const txResponse = await integrationSdk.transactions.query({
              customerId: studentId,
              include: ['listing'],
            });
            return txResponse.data.data;
          } catch (e) {
            // If transaction query fails for a student, skip
            return [];
          }
        });

        const transactionResults = await Promise.all(transactionPromises);
        const allTransactions = transactionResults.flat();

        // Aggregate stats from transactions
        allTransactions.forEach(tx => {
          const lastTransition = tx.attributes.lastTransition;

          // Count based on transaction state
          if (lastTransition === 'transition/apply') {
            stats.projectsApplied++;
          } else if (lastTransition === 'transition/accept') {
            stats.projectsAccepted++;
          } else if (lastTransition === 'transition/decline') {
            stats.projectsDeclined++;
          } else if (
            lastTransition === 'transition/mark-completed' ||
            lastTransition === 'transition/review-1-by-provider' ||
            lastTransition === 'transition/review-1-by-customer' ||
            lastTransition === 'transition/review-2-by-provider' ||
            lastTransition === 'transition/review-2-by-customer'
          ) {
            stats.projectsCompleted++;
          }

          // Check if this was an invitation (provider-initiated)
          const protectedData = tx.attributes.protectedData || {};
          if (protectedData.isInvitation) {
            stats.invitationsReceived++;
          }
        });

        // Adjust counts to be cumulative (accepted includes completed, etc.)
        // Applied = all transactions that have been initiated
        stats.projectsApplied = allTransactions.length;

      } catch (txError) {
        console.error('Error querying transactions for education dashboard:', txError.message);
        // Continue with zero stats if transaction query fails
      }
    }

    // Step 6: Return response
    res.status(200).json({
      stats,
      students,
      institutionName,
      institutionDomain,
      pagination: {
        totalItems: meta.totalItems,
        totalPages: meta.totalPages,
        page: meta.page,
        perPage: meta.perPage,
      },
    });

  } catch (error) {
    console.error('Education dashboard error:', error);
    handleError(res, error);
  }
};
