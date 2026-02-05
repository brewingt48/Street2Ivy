const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/corporate/dashboard-stats
 *
 * Returns enhanced statistics for the corporate partner dashboard.
 *
 * Returns:
 *   {
 *     projectsByCategory: { "technology": 5, "marketing": 3, ... },
 *     applicationStats: {
 *       total: 200,
 *       pending: 65,
 *       accepted: 85,
 *       declined: 50
 *     },
 *     completionStats: {
 *       completed: 40,
 *       completionRate: 0.85,
 *       avgDaysToCompletion: 14.5
 *     },
 *     financialStats: {
 *       totalProjectValue: { amount: 50000, currency: "USD" },
 *       avgProjectValue: { amount: 5000, currency: "USD" }
 *     }
 *   }
 */
module.exports = async (req, res) => {
  try {
    // Step 1: Get current user and verify they are a corporate partner
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    if (userType !== 'corporate-partner') {
      return res.status(403).json({
        error: 'Access denied. Only corporate partners can access this dashboard.',
      });
    }

    const currentUserId = currentUser.id.uuid;

    // Step 2: Query all listings owned by this user
    const listingsResponse = await sdk.ownListings.query({
      perPage: 100,
      'fields.listing': ['title', 'publicData', 'state', 'price'],
    });

    const listings = listingsResponse.data.data;
    const listingIds = listings.map(l => l.id.uuid);

    // Step 3: Aggregate projects by category
    const projectsByCategory = {};
    const projectsByState = {
      published: 0,
      closed: 0,
      draft: 0,
      pendingApproval: 0,
    };

    let totalProjectValue = 0;
    const currency = 'USD'; // Default currency

    listings.forEach(listing => {
      const category = listing.attributes.publicData?.industryCategory || 'other';
      projectsByCategory[category] = (projectsByCategory[category] || 0) + 1;

      // Count by listing state
      const state = listing.attributes.state;
      if (state === 'published') projectsByState.published++;
      else if (state === 'closed') projectsByState.closed++;
      else if (state === 'draft') projectsByState.draft++;
      else if (state === 'pendingApproval') projectsByState.pendingApproval++;

      // Sum project values
      const price = listing.attributes.price;
      if (price && price.amount) {
        totalProjectValue += price.amount;
      }
    });

    // Step 4: Query transactions for these listings
    const integrationSdk = getIntegrationSdk();

    let applicationStats = {
      total: 0,
      pending: 0,
      accepted: 0,
      declined: 0,
    };

    let completionStats = {
      completed: 0,
      completionRate: 0,
      avgDaysToCompletion: 0,
    };

    let completionTimes = [];

    // Query transactions where the current user is the provider
    try {
      const transactionsResponse = await integrationSdk.transactions.query({
        providerId: currentUserId,
        include: ['listing'],
        perPage: 100,
      });

      const transactions = transactionsResponse.data.data;

      transactions.forEach(tx => {
        const lastTransition = tx.attributes.lastTransition;
        applicationStats.total++;

        // Categorize by state
        if (lastTransition === 'transition/apply') {
          applicationStats.pending++;
        } else if (lastTransition === 'transition/accept') {
          applicationStats.accepted++;
        } else if (lastTransition === 'transition/decline') {
          applicationStats.declined++;
        } else if (
          lastTransition === 'transition/mark-completed' ||
          lastTransition.includes('review')
        ) {
          completionStats.completed++;

          // Calculate time to completion
          const createdAt = new Date(tx.attributes.createdAt);
          const completedAt = new Date(tx.attributes.lastTransitionedAt);
          const daysToComplete = (completedAt - createdAt) / (1000 * 60 * 60 * 24);
          completionTimes.push(daysToComplete);
        }
      });

      // Calculate completion rate
      const decidedTransactions =
        applicationStats.accepted + applicationStats.declined + completionStats.completed;
      if (decidedTransactions > 0) {
        completionStats.completionRate =
          (applicationStats.accepted + completionStats.completed) / decidedTransactions;
      }

      // Calculate average days to completion
      if (completionTimes.length > 0) {
        completionStats.avgDaysToCompletion =
          completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      }
    } catch (txError) {
      console.error('Error querying transactions for corporate stats:', txError.message);
      // Continue with zero stats
    }

    // Step 5: Return response
    res.status(200).json({
      projectsByCategory,
      projectsByState,
      applicationStats,
      completionStats: {
        ...completionStats,
        completionRate: Math.round(completionStats.completionRate * 100) / 100,
        avgDaysToCompletion: Math.round(completionStats.avgDaysToCompletion * 10) / 10,
      },
      financialStats: {
        totalProjectValue: {
          amount: totalProjectValue,
          currency,
        },
        avgProjectValue: {
          amount: listings.length > 0 ? Math.round(totalProjectValue / listings.length) : 0,
          currency,
        },
        totalProjects: listings.length,
      },
    });
  } catch (error) {
    console.error('Corporate dashboard stats error:', error);
    handleError(res, error);
  }
};
