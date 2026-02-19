const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { handleError, getSdk } = require('../api-util/sdk');
const { sanitizeString } = require('../api-util/security');

/**
 * GET /api/user-stats/:userId
 *
 * Server-side endpoint for fetching user project statistics.
 * Returns completed projects count, pending projects count for students,
 * or open projects count for corporate partners.
 *
 * Access: corporate-partner, system-admin, educational-admin
 */
module.exports = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      error: 'User ID is required',
      code: 'MISSING_USER_ID',
    });
  }

  // Verify caller has permission
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const currentUserPublicData = currentUser.attributes?.profile?.publicData || {};
    const callerUserType = currentUserPublicData.userType;

    // Only corporate partners, system admins, and educational admins can fetch user stats
    const allowedTypes = ['corporate-partner', 'system-admin', 'educational-admin'];
    if (!allowedTypes.includes(callerUserType)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sanitizedUserId = sanitizeString(userId, { maxLength: 50 });
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // First, get the user to determine their type
    const userResponse = await integrationSdk.users.show({ id: sanitizedUserId });
    const targetUser = userResponse.data.data;
    const targetUserType = targetUser.attributes?.profile?.publicData?.userType;

    // For educational admins, verify the student is from their institution
    if (callerUserType === 'educational-admin' && targetUserType === 'student') {
      const adminDomain = currentUserPublicData.institutionDomain;
      const studentDomain = targetUser.attributes?.profile?.publicData?.emailDomain;
      if (adminDomain && studentDomain && adminDomain !== studentDomain) {
        return res.status(403).json({ error: 'Access denied - student not from your institution' });
      }
    }

    if (targetUserType === 'student') {
      // Fetch student's transaction stats
      // Query transactions where the student is the customer
      const transactionsResponse = await integrationSdk.transactions.query({
        customerId: sanitizedUserId,
        include: ['listing'],
        perPage: 100, // Get enough to count
      });

      const transactions = transactionsResponse.data.data || [];

      // Count by status
      let completedProjects = 0;
      let pendingProjects = 0;
      let activeProjects = 0;

      transactions.forEach(tx => {
        const lastTransition = tx.attributes.lastTransition;

        // Completed states (based on typical transaction process)
        if (
          lastTransition === 'transition/complete' ||
          lastTransition === 'transition/review-1-by-customer' ||
          lastTransition === 'transition/review-2-by-customer' ||
          lastTransition === 'transition/review-1-by-provider' ||
          lastTransition === 'transition/review-2-by-provider'
        ) {
          completedProjects++;
        }
        // Pending/Active states
        else if (
          lastTransition === 'transition/accept' ||
          lastTransition === 'transition/confirm-payment' ||
          lastTransition === 'transition/request-payment'
        ) {
          activeProjects++;
        }
        // Awaiting response
        else if (
          lastTransition === 'transition/request-payment-after-enquiry' ||
          lastTransition === 'transition/enquire'
        ) {
          pendingProjects++;
        }
      });

      return res.status(200).json({
        userId: sanitizedUserId,
        userType: targetUserType,
        stats: {
          completedProjects,
          pendingProjects,
          activeProjects,
          totalTransactions: transactions.length,
        },
      });
    } else if (targetUserType === 'corporate-partner') {
      // Fetch corporate partner's listing stats
      const listingsResponse = await integrationSdk.listings.query({
        authorId: sanitizedUserId,
        states: ['published', 'closed'],
        perPage: 100,
      });

      const listings = listingsResponse.data.data || [];
      const openProjects = listings.filter(l => l.attributes.state === 'published').length;
      const closedProjects = listings.filter(l => l.attributes.state === 'closed').length;

      // Get transactions for this user's listings
      const transactionsResponse = await integrationSdk.transactions.query({
        providerId: sanitizedUserId,
        perPage: 100,
      });

      const transactions = transactionsResponse.data.data || [];
      let completedTransactions = 0;
      let activeTransactions = 0;

      transactions.forEach(tx => {
        const lastTransition = tx.attributes.lastTransition;
        if (
          lastTransition === 'transition/complete' ||
          lastTransition?.includes('review')
        ) {
          completedTransactions++;
        } else if (
          lastTransition === 'transition/accept' ||
          lastTransition === 'transition/confirm-payment'
        ) {
          activeTransactions++;
        }
      });

      return res.status(200).json({
        userId: sanitizedUserId,
        userType: targetUserType,
        stats: {
          openProjects,
          closedProjects,
          totalListings: listings.length,
          completedTransactions,
          activeTransactions,
          totalTransactions: transactions.length,
        },
      });
    } else {
      // For other user types, return basic info
      return res.status(200).json({
        userId: sanitizedUserId,
        userType: targetUserType,
        stats: {},
      });
    }
  } catch (e) {
    console.error('user-stats error:', e);
    handleError(res, e);
  }
};
