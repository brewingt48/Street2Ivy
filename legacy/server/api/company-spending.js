const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/company/:companyId/spending
 *
 * Returns spending statistics for a specific company.
 * Accessible by: students, educational admins, and system admins
 *
 * Returns:
 *   {
 *     companyId: "...",
 *     companyName: "...",
 *     spending: {
 *       totalSpent: { amount: 50000, currency: "USD" },
 *       avgProjectValue: { amount: 5000, currency: "USD" },
 *       totalProjects: 10,
 *       completedProjects: 8
 *     }
 *   }
 */
module.exports = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Get current user and verify access
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    // Allow students, educational admins, and system admins
    const allowedUserTypes = ['student', 'educational-admin', 'education', 'admin', 'system-admin'];
    const isAllowed = allowedUserTypes.includes(userType) || publicData.isSystemAdmin === true;

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Access denied. Only students, educational admins, and system admins can view company spending.',
      });
    }

    // Use integration SDK to query company data
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Get the company user profile
    const companyResponse = await integrationSdk.users.show({
      id: companyId,
      include: ['profileImage'],
      'fields.user': ['profile.displayName', 'profile.publicData'],
    });

    const company = companyResponse.data.data;
    const companyName = company.attributes.profile.displayName || 'Unknown Company';

    // Query all listings by this company
    const listingsResponse = await integrationSdk.listings.query({
      authorId: companyId,
      states: ['published', 'closed'],
      'fields.listing': ['title', 'price', 'state'],
      perPage: 100,
    });

    const listings = listingsResponse.data.data;

    // Query transactions where this company is the provider
    const transactionsResponse = await integrationSdk.transactions.query({
      providerId: companyId,
      perPage: 100,
    });

    const transactions = transactionsResponse.data.data;

    // Calculate spending stats
    let totalSpent = 0;
    let completedProjects = 0;
    const currency = 'USD';

    // Sum up listing prices for active/closed listings
    listings.forEach(listing => {
      const price = listing.attributes.price;
      if (price && price.amount) {
        totalSpent += price.amount;
      }
      if (listing.attributes.state === 'closed') {
        completedProjects++;
      }
    });

    // Count completed transactions
    transactions.forEach(tx => {
      const lastTransition = tx.attributes.lastTransition;
      if (
        lastTransition === 'transition/complete' ||
        lastTransition === 'transition/mark-completed' ||
        lastTransition?.includes('review')
      ) {
        // Already counted from listings
      }
    });

    const totalProjects = listings.length;
    const avgProjectValue = totalProjects > 0 ? Math.round(totalSpent / totalProjects) : 0;

    res.status(200).json({
      companyId,
      companyName,
      spending: {
        totalSpent: {
          amount: totalSpent,
          currency,
        },
        avgProjectValue: {
          amount: avgProjectValue,
          currency,
        },
        totalProjects,
        completedProjects,
      },
    });
  } catch (error) {
    console.error('Company spending error:', error);
    handleError(res, error);
  }
};

/**
 * GET /api/companies/spending-report
 *
 * Returns spending statistics for all companies.
 * Accessible by: educational admins and system admins only
 *
 * Returns:
 *   {
 *     companies: [
 *       {
 *         companyId: "...",
 *         companyName: "...",
 *         totalSpent: 50000,
 *         totalProjects: 10,
 *         completedProjects: 8
 *       }
 *     ],
 *     totals: {
 *       totalSpentAllCompanies: 500000,
 *       totalProjectsAllCompanies: 100,
 *       avgSpendingPerCompany: 50000
 *     }
 *   }
 */
module.exports.allCompanies = async (req, res) => {
  try {
    // Get current user and verify access
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    // Only educational admins and system admins can see all companies
    const allowedUserTypes = ['educational-admin', 'education', 'admin', 'system-admin'];
    const isAllowed = allowedUserTypes.includes(userType) || publicData.isSystemAdmin === true;

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Access denied. Only educational admins and system admins can view all company spending.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Query all corporate users
    const usersResponse = await integrationSdk.users.query({
      pub_userType: 'corporate-partner,corporate',
      'fields.user': ['profile.displayName', 'profile.publicData'],
      perPage: 100,
    });

    const corporateUsers = usersResponse.data.data;
    const companiesSpending = [];

    let totalSpentAllCompanies = 0;
    let totalProjectsAllCompanies = 0;

    // Get spending for each company
    for (const company of corporateUsers) {
      const companyId = company.id.uuid;
      const companyName = company.attributes.profile.displayName || 'Unknown Company';

      // Query listings for this company
      const listingsResponse = await integrationSdk.listings.query({
        authorId: companyId,
        states: ['published', 'closed'],
        'fields.listing': ['price', 'state'],
        perPage: 100,
      });

      const listings = listingsResponse.data.data;
      let totalSpent = 0;
      let completedProjects = 0;

      listings.forEach(listing => {
        const price = listing.attributes.price;
        if (price && price.amount) {
          totalSpent += price.amount;
        }
        if (listing.attributes.state === 'closed') {
          completedProjects++;
        }
      });

      companiesSpending.push({
        companyId,
        companyName,
        totalSpent,
        totalProjects: listings.length,
        completedProjects,
      });

      totalSpentAllCompanies += totalSpent;
      totalProjectsAllCompanies += listings.length;
    }

    // Sort by total spent (descending)
    companiesSpending.sort((a, b) => b.totalSpent - a.totalSpent);

    res.status(200).json({
      companies: companiesSpending,
      totals: {
        totalSpentAllCompanies,
        totalProjectsAllCompanies,
        avgSpendingPerCompany:
          companiesSpending.length > 0
            ? Math.round(totalSpentAllCompanies / companiesSpending.length)
            : 0,
        totalCompanies: companiesSpending.length,
      },
      currency: 'USD',
    });
  } catch (error) {
    console.error('All companies spending error:', error);
    handleError(res, error);
  }
};
