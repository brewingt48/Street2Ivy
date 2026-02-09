/**
 * Alumni Dashboard API
 *
 * Provides dashboard data for alumni users.
 * Returns stats about the alumni's own listings and activity.
 */

const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/alumni/dashboard
 *
 * Returns dashboard stats and recent activity for the authenticated alumni user.
 */
module.exports = async (req, res) => {
  try {
    // Step 1: Get current user and verify they are alumni
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'alumni') {
      return res.status(403).json({
        error: 'Access denied. Only alumni users can access this dashboard.',
      });
    }

    const userId = currentUser.id.uuid;
    const institutionDomain = publicData.institutionDomain;

    // Step 2: Get the alumni's own listings
    const integrationSdk = getIntegrationSdk();

    let ownListings = [];
    try {
      const listingsResponse = await integrationSdk.listings.query({
        authorId: userId,
        include: ['images'],
        'fields.image': ['variants.listing-card', 'variants.listing-card-2x'],
        perPage: 100,
      });
      ownListings = listingsResponse.data.data || [];
    } catch (e) {
      console.error('Error fetching alumni listings:', e.message);
    }

    // Step 3: Get transactions where alumni is the provider (applications to their projects)
    let totalApplications = 0;
    let activeProjects = 0;

    try {
      const txResponse = await integrationSdk.transactions.query({
        providerId: userId,
      });
      const transactions = txResponse.data.data || [];
      totalApplications = transactions.length;

      // Count active projects (listings with at least one accepted application)
      const activeListingIds = new Set();
      transactions.forEach(tx => {
        const lastTransition = tx.attributes.lastTransition;
        if (lastTransition === 'transition/accept') {
          const listingId = tx.relationships?.listing?.data?.id?.uuid;
          if (listingId) activeListingIds.add(listingId);
        }
      });
      activeProjects = activeListingIds.size;
    } catch (e) {
      console.error('Error fetching alumni transactions:', e.message);
    }

    // Step 4: Build recent activity from listings and transactions
    const recentActivity = ownListings
      .slice(0, 5)
      .map(listing => ({
        type: 'listing',
        id: listing.id.uuid,
        title: listing.attributes.title,
        state: listing.attributes.state,
        createdAt: listing.attributes.createdAt,
      }));

    // Step 5: Return dashboard response
    res.status(200).json({
      stats: {
        projectsCreated: ownListings.length,
        activeProjects,
        totalApplications,
      },
      recentActivity,
      institutionDomain,
      profile: {
        displayName: currentUser.attributes.profile.displayName,
        currentCompany: publicData.currentCompany || null,
        currentRole: publicData.currentRole || null,
        graduationYear: publicData.graduationYear || null,
      },
    });
  } catch (error) {
    console.error('Alumni dashboard error:', error);
    handleError(res, error);
  }
};
