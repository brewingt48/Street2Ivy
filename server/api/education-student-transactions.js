const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/education/students/:studentId/transactions
 *
 * Returns transaction history for a specific student.
 *
 * Privacy: Only accessible by educational admins, and only for students
 * whose email domain matches the admin's institution domain.
 *
 * Query params:
 *   page     - Pagination page (default: 1)
 *   perPage  - Results per page (default: 20, max: 100)
 *
 * Returns:
 *   {
 *     student: { ... },
 *     transactions: [...],
 *     pagination: {...}
 *   }
 */
module.exports = async (req, res) => {
  const { studentId } = req.params;
  const { page = '1', perPage = '20' } = req.query;

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    // Step 1: Get current user and verify they are an educational admin
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    if (userType !== 'educational-admin') {
      return res.status(403).json({
        error: 'Access denied. Only educational administrators can access student transactions.',
      });
    }

    // Step 2: Get the institution domain for verification
    const institutionDomain = publicData.institutionDomain;

    if (!institutionDomain) {
      return res.status(400).json({
        error: 'Institution domain not configured. Please update your profile.',
      });
    }

    // Step 3: Get the student and verify they belong to this institution
    const integrationSdk = getIntegrationSdk();

    const studentResponse = await integrationSdk.users.show({
      id: studentId,
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    });

    const student = studentResponse.data.data;
    const studentPublicData = student.attributes.profile.publicData || {};

    // Verify this student belongs to the admin's institution
    const studentEmailDomain = studentPublicData.emailDomain?.toLowerCase();
    if (studentEmailDomain !== institutionDomain.toLowerCase()) {
      return res.status(403).json({
        error: 'Access denied. This student is not from your institution.',
      });
    }

    // Verify the student is actually a student
    if (studentPublicData.userType !== 'student') {
      return res.status(400).json({
        error: 'The specified user is not a student.',
      });
    }

    // Step 4: Query transactions for this student
    const transactionsResponse = await integrationSdk.transactions.query({
      customerId: studentId,
      include: ['listing', 'provider', 'provider.profileImage'],
      'fields.listing': ['title', 'publicData'],
      'fields.user': ['profile.displayName', 'profile.publicData'],
      'fields.image': ['variants.square-small'],
      page: parseInt(page, 10),
      perPage: Math.min(parseInt(perPage, 10) || 20, 100),
    });

    const { data: txData, included = [], meta } = transactionsResponse.data;

    // Build lookup maps for included data
    const listingMap = {};
    const userMap = {};
    const imageMap = {};

    included.forEach(item => {
      if (item.type === 'listing') {
        listingMap[item.id.uuid] = item;
      } else if (item.type === 'user') {
        userMap[item.id.uuid] = item;
      } else if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform transactions for the frontend
    const transactions = txData.map(tx => {
      const listingRef = tx.relationships?.listing?.data;
      const providerRef = tx.relationships?.provider?.data;

      const listing = listingRef ? listingMap[listingRef.id.uuid] : null;
      const provider = providerRef ? userMap[providerRef.id.uuid] : null;

      return {
        id: tx.id.uuid,
        type: tx.type,
        attributes: {
          createdAt: tx.attributes.createdAt,
          lastTransition: tx.attributes.lastTransition,
          lastTransitionedAt: tx.attributes.lastTransitionedAt,
          payinTotal: tx.attributes.payinTotal,
          payoutTotal: tx.attributes.payoutTotal,
          state: getTransactionState(tx.attributes.lastTransition),
        },
        listing: listing
          ? {
              id: listing.id.uuid,
              title: listing.attributes.title,
              publicData: listing.attributes.publicData,
            }
          : null,
        provider: provider
          ? {
              id: provider.id.uuid,
              displayName: provider.attributes.profile.displayName,
              companyName: provider.attributes.profile.publicData?.companyName,
            }
          : null,
      };
    });

    // Transform student data
    const profileImageRef = student.relationships?.profileImage?.data;
    const profileImage = profileImageRef
      ? studentResponse.data.included?.find(i => i.id.uuid === profileImageRef.id.uuid)
      : null;

    const studentData = {
      id: student.id.uuid,
      displayName: student.attributes.profile.displayName,
      abbreviatedName: student.attributes.profile.abbreviatedName,
      university: studentPublicData.university,
      major: studentPublicData.major,
      graduationYear: studentPublicData.graduationYear,
      profileImage: profileImage
        ? {
            id: profileImage.id.uuid,
            attributes: profileImage.attributes,
          }
        : null,
    };

    // Step 5: Return response
    res.status(200).json({
      student: studentData,
      transactions,
      pagination: {
        totalItems: meta.totalItems,
        totalPages: meta.totalPages,
        page: meta.page,
        perPage: meta.perPage,
      },
    });

  } catch (error) {
    console.error('Education student transactions error:', error);
    handleError(res, error);
  }
};

/**
 * Map last transition to a human-readable state
 */
function getTransactionState(lastTransition) {
  const stateMap = {
    'transition/apply': 'applied',
    'transition/accept': 'accepted',
    'transition/decline': 'declined',
    'transition/mark-completed': 'completed',
    'transition/review-1-by-provider': 'completed',
    'transition/review-1-by-customer': 'completed',
    'transition/review-2-by-provider': 'reviewed',
    'transition/review-2-by-customer': 'reviewed',
    'transition/expire-review-period': 'completed',
  };

  return stateMap[lastTransition] || 'pending';
}
