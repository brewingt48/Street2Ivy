const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
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

    // Get subscription status
    const subscriptionStatus = {
      depositPaid: publicData.depositPaid || false,
      depositPaidDate: publicData.depositPaidDate || null,
      aiCoachingApproved: publicData.aiCoachingApproved || false,
      aiCoachingApprovedDate: publicData.aiCoachingApprovedDate || null,
    };

    if (!institutionDomain) {
      return res.status(400).json({
        error:
          'Institution domain not configured. Please update your profile with a valid institutional email.',
      });
    }

    // Step 3: Query students from this institution using Integration API
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

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
      activeStudents: 0, // Students with at least one application
      projectsApplied: 0,
      projectsAccepted: 0,
      projectsDeclined: 0,
      projectsCompleted: 0,
      projectsPending: 0, // Applications still pending review
      invitationsReceived: 0,
      uniqueCompanies: 0, // Unique companies students have engaged with
      acceptanceRate: 0,
      completionRate: 0,
    };

    // Track data for student-level breakdown
    const studentActivityMap = {}; // studentId -> { applications, acceptances, completions, etc. }
    const companyIds = new Set();
    const allTransactions = [];

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
              include: ['listing', 'provider'],
            });
            return { studentId, transactions: txResponse.data.data };
          } catch (e) {
            // If transaction query fails for a student, skip
            return { studentId, transactions: [] };
          }
        });

        const transactionResults = await Promise.all(transactionPromises);

        // Process transactions and build student activity map
        transactionResults.forEach(({ studentId, transactions }) => {
          if (transactions.length > 0) {
            stats.activeStudents++;
            studentActivityMap[studentId] = {
              applications: 0,
              acceptances: 0,
              declines: 0,
              completions: 0,
              pending: 0,
              invitations: 0,
            };
          }

          transactions.forEach(tx => {
            allTransactions.push(tx);
            const lastTransition = tx.attributes.lastTransition;
            const activity = studentActivityMap[studentId];

            // Track unique companies
            const providerId = tx.relationships?.provider?.data?.id?.uuid;
            if (providerId) {
              companyIds.add(providerId);
            }

            // Count based on transaction state
            if (lastTransition === 'transition/apply') {
              stats.projectsPending++;
              if (activity) activity.pending++;
            } else if (lastTransition === 'transition/accept') {
              stats.projectsAccepted++;
              if (activity) activity.acceptances++;
            } else if (lastTransition === 'transition/decline') {
              stats.projectsDeclined++;
              if (activity) activity.declines++;
            } else if (
              lastTransition === 'transition/mark-completed' ||
              lastTransition === 'transition/review-1-by-provider' ||
              lastTransition === 'transition/review-1-by-customer' ||
              lastTransition === 'transition/review-2-by-provider' ||
              lastTransition === 'transition/review-2-by-customer'
            ) {
              stats.projectsCompleted++;
              if (activity) activity.completions++;
            }

            // Check if this was an invitation (provider-initiated)
            const protectedData = tx.attributes.protectedData || {};
            if (protectedData.isInvitation) {
              stats.invitationsReceived++;
              if (activity) activity.invitations++;
            }

            // Count all applications
            if (activity) activity.applications++;
          });
        });

        // Calculate total applications
        stats.projectsApplied = allTransactions.length;
        stats.uniqueCompanies = companyIds.size;

        // Calculate rates
        const totalDecisions = stats.projectsAccepted + stats.projectsDeclined;
        stats.acceptanceRate = totalDecisions > 0
          ? Math.round((stats.projectsAccepted / totalDecisions) * 100)
          : 0;

        stats.completionRate = stats.projectsAccepted > 0
          ? Math.round((stats.projectsCompleted / stats.projectsAccepted) * 100)
          : 0;

      } catch (txError) {
        console.error('Error querying transactions for education dashboard:', txError.message);
        // Continue with zero stats if transaction query fails
      }
    }

    // Add activity data to each student for reports
    const studentsWithActivity = students.map(student => ({
      ...student,
      activity: studentActivityMap[student.id] || {
        applications: 0,
        acceptances: 0,
        declines: 0,
        completions: 0,
        pending: 0,
        invitations: 0,
      },
    }));

    // Step 6: Return response
    res.status(200).json({
      stats,
      students: studentsWithActivity,
      institutionName,
      institutionDomain,
      subscriptionStatus,
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
