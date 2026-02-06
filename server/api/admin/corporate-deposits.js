const { getIntegrationSdk } = require('../../api-util/integrationSdk');
const { getSdk, handleError } = require('../../api-util/sdk');

// Security: UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate pagination parameters with bounds
 */
function validatePagination(page, perPage) {
  const pageNum = parseInt(page, 10) || 1;
  const perPageNum = parseInt(perPage, 10) || 20;

  return {
    page: Math.max(1, Math.min(pageNum, 100)), // Max 100 pages
    perPage: Math.max(1, Math.min(perPageNum, 100)), // Max 100 items per page
  };
}

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
 * GET /api/admin/corporate-deposits
 *
 * Get all corporate partners with their deposit status and pending transactions.
 * Groups deposits by corporate partner for easier management.
 */
async function listCorporateDeposits(req, res) {
  const { status, page = '1', perPage = '20' } = req.query;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Get all corporate partners
    const usersResponse = await integrationSdk.users.query({
      pub_userType: 'corporate-partner',
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      perPage: 100,
    });

    const corporatePartners = usersResponse.data.data;
    const included = usersResponse.data.included || [];

    // Build image map
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // For each corporate partner, get their accepted transactions that need deposit tracking
    const corporateDeposits = [];

    for (const partner of corporatePartners) {
      const partnerId = partner.id.uuid;
      const publicData = partner.attributes.profile.publicData || {};
      const profileImageRef = partner.relationships?.profileImage?.data;
      const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;

      // Query transactions where this corporate partner is the provider
      // and transaction is in accepted state (student hired but may need deposit)
      const txResponse = await integrationSdk.transactions.query({
        providerId: partnerId,
        include: ['listing', 'customer'],
        perPage: 100,
      });

      const transactions = txResponse.data.data || [];
      const txIncluded = txResponse.data.included || [];

      // Build lookup maps
      const listingsMap = {};
      const customersMap = {};
      txIncluded.forEach(item => {
        if (item.type === 'listing') {
          listingsMap[item.id.uuid] = item;
        } else if (item.type === 'user') {
          customersMap[item.id.uuid] = item;
        }
      });

      // Filter to accepted transactions that need deposit tracking
      const acceptedTransitions = [
        'transition/accept',
        'transition/mark-completed',
        'transition/review-1-by-provider',
        'transition/review-1-by-customer',
        'transition/review-2-by-provider',
        'transition/review-2-by-customer',
      ];

      const relevantTransactions = transactions.filter(tx => {
        const lastTransition = tx.attributes.lastTransition;
        return acceptedTransitions.some(t => lastTransition === t || lastTransition?.includes('accept'));
      });

      // Categorize transactions
      const pendingDeposit = [];
      const depositConfirmed = [];
      const completed = [];

      relevantTransactions.forEach(tx => {
        const metadata = tx.attributes.metadata || {};
        const lastTransition = tx.attributes.lastTransition;
        const listingId = tx.relationships?.listing?.data?.id?.uuid;
        const customerId = tx.relationships?.customer?.data?.id?.uuid;
        const listing = listingsMap[listingId];
        const customer = customersMap[customerId];

        const txData = {
          id: tx.id.uuid,
          createdAt: tx.attributes.createdAt,
          lastTransition,
          listing: listing ? {
            id: listing.id.uuid,
            title: listing.attributes.title,
          } : null,
          student: customer ? {
            id: customer.id.uuid,
            displayName: customer.attributes.profile.displayName,
            email: customer.attributes.email,
          } : null,
          depositConfirmed: metadata.depositConfirmed || false,
          depositConfirmedAt: metadata.depositConfirmedAt || null,
          depositAmount: metadata.depositAmount || null,
          depositPaymentMethod: metadata.depositPaymentMethod || null,
          workHoldCleared: metadata.workHoldCleared || false,
          workHoldClearedAt: metadata.workHoldClearedAt || null,
        };

        // Check if work is completed
        const isCompleted = ['transition/mark-completed', 'transition/review-1-by-provider',
          'transition/review-1-by-customer', 'transition/review-2-by-provider',
          'transition/review-2-by-customer'].includes(lastTransition);

        if (isCompleted) {
          completed.push(txData);
        } else if (metadata.workHoldCleared) {
          depositConfirmed.push(txData);
        } else {
          pendingDeposit.push(txData);
        }
      });

      // Only include partners with relevant transactions or based on status filter
      const totalPending = pendingDeposit.length;
      const totalConfirmed = depositConfirmed.length;
      const totalCompleted = completed.length;

      if (status === 'pending' && totalPending === 0) continue;
      if (status === 'confirmed' && totalConfirmed === 0) continue;
      if (status === 'completed' && totalCompleted === 0) continue;

      if (relevantTransactions.length > 0 || !status) {
        corporateDeposits.push({
          id: partnerId,
          displayName: partner.attributes.profile.displayName,
          companyName: publicData.companyName || 'Unknown Company',
          email: partner.attributes.email,
          profileImage: profileImage ? {
            id: profileImage.id.uuid,
            attributes: profileImage.attributes,
          } : null,
          stats: {
            pendingDeposits: totalPending,
            depositsConfirmed: totalConfirmed,
            projectsCompleted: totalCompleted,
            totalHired: relevantTransactions.length,
          },
          transactions: {
            pendingDeposit,
            depositConfirmed,
            completed,
          },
        });
      }
    }

    // Sort by pending deposits (most first)
    corporateDeposits.sort((a, b) => b.stats.pendingDeposits - a.stats.pendingDeposits);

    // Paginate
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const paginatedData = corporateDeposits.slice(startIndex, startIndex + perPageNum);

    // Calculate summary stats
    const summaryStats = {
      totalCorporatePartners: corporateDeposits.length,
      totalPendingDeposits: corporateDeposits.reduce((sum, cp) => sum + cp.stats.pendingDeposits, 0),
      totalDepositsConfirmed: corporateDeposits.reduce((sum, cp) => sum + cp.stats.depositsConfirmed, 0),
      totalProjectsCompleted: corporateDeposits.reduce((sum, cp) => sum + cp.stats.projectsCompleted, 0),
    };

    res.status(200).json({
      corporatePartners: paginatedData,
      stats: summaryStats,
      pagination: {
        totalItems: corporateDeposits.length,
        totalPages: Math.ceil(corporateDeposits.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
    });
  } catch (error) {
    console.error('Admin list corporate deposits error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/corporate-deposits/:partnerId
 *
 * Get detailed deposit information for a specific corporate partner.
 */
async function getCorporatePartnerDeposits(req, res) {
  const { partnerId } = req.params;

  if (!partnerId) {
    return res.status(400).json({ error: 'Partner ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(partnerId)) {
    return res.status(400).json({ error: 'Invalid partner ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the corporate partner
    const userResponse = await integrationSdk.users.show({
      id: partnerId,
      include: ['profileImage'],
    });

    const partner = userResponse.data.data;
    if (!partner) {
      return res.status(404).json({ error: 'Corporate partner not found.' });
    }

    const publicData = partner.attributes.profile.publicData || {};
    if (publicData.userType !== 'corporate-partner') {
      return res.status(400).json({ error: 'User is not a corporate partner.' });
    }

    // Get all their transactions
    const txResponse = await integrationSdk.transactions.query({
      providerId: partnerId,
      include: ['listing', 'customer'],
      perPage: 100,
    });

    const transactions = txResponse.data.data || [];
    const included = txResponse.data.included || [];

    // Build lookup maps
    const listingsMap = {};
    const customersMap = {};
    included.forEach(item => {
      if (item.type === 'listing') {
        listingsMap[item.id.uuid] = item;
      } else if (item.type === 'user') {
        customersMap[item.id.uuid] = item;
      }
    });

    // Process all transactions
    const allTransactions = transactions.map(tx => {
      const metadata = tx.attributes.metadata || {};
      const lastTransition = tx.attributes.lastTransition;
      const listingId = tx.relationships?.listing?.data?.id?.uuid;
      const customerId = tx.relationships?.customer?.data?.id?.uuid;
      const listing = listingsMap[listingId];
      const customer = customersMap[customerId];

      return {
        id: tx.id.uuid,
        createdAt: tx.attributes.createdAt,
        lastTransition,
        listing: listing ? {
          id: listing.id.uuid,
          title: listing.attributes.title,
          publicData: listing.attributes.publicData,
        } : null,
        student: customer ? {
          id: customer.id.uuid,
          displayName: customer.attributes.profile.displayName,
          email: customer.attributes.email,
          university: customer.attributes.profile.publicData?.university,
        } : null,
        depositConfirmed: metadata.depositConfirmed || false,
        depositConfirmedAt: metadata.depositConfirmedAt || null,
        depositConfirmedBy: metadata.depositConfirmedBy || null,
        depositAmount: metadata.depositAmount || null,
        depositPaymentMethod: metadata.depositPaymentMethod || null,
        depositNotes: metadata.depositNotes || null,
        workHoldCleared: metadata.workHoldCleared || false,
        workHoldClearedAt: metadata.workHoldClearedAt || null,
        workHoldClearedBy: metadata.workHoldClearedBy || null,
      };
    });

    res.status(200).json({
      partner: {
        id: partnerId,
        displayName: partner.attributes.profile.displayName,
        companyName: publicData.companyName,
        email: partner.attributes.email,
        createdAt: partner.attributes.createdAt,
      },
      transactions: allTransactions,
    });
  } catch (error) {
    console.error('Admin get corporate partner deposits error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/corporate-deposits/:transactionId/clear-hold
 *
 * Clear the work hold for a transaction, allowing the student to proceed with work.
 * This is separate from deposit confirmation - even if deposit is confirmed,
 * the admin may want to explicitly clear the hold.
 */
async function clearWorkHold(req, res) {
  const { transactionId } = req.params;
  const { notes } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(transactionId)) {
    return res.status(400).json({ error: 'Invalid transaction ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['provider', 'customer', 'listing'],
    });

    const transaction = txResponse.data.data;
    const currentMetadata = transaction.attributes.metadata || {};

    // Check if transaction is in accepted state
    const lastTransition = transaction.attributes.lastTransition;
    if (!lastTransition?.includes('accept')) {
      return res.status(400).json({
        error: 'Transaction must be in accepted state to clear work hold.',
      });
    }

    // Update transaction metadata to clear the work hold
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        workHoldCleared: true,
        workHoldClearedAt: new Date().toISOString(),
        workHoldClearedBy: admin.id.uuid,
        workHoldClearedNotes: notes || null,
        // Also mark deposit as confirmed if not already
        depositConfirmed: currentMetadata.depositConfirmed || true,
        depositConfirmedAt: currentMetadata.depositConfirmedAt || new Date().toISOString(),
        depositConfirmedBy: currentMetadata.depositConfirmedBy || admin.id.uuid,
      },
    });

    // Get student info for response
    const included = txResponse.data.included || [];
    const customerId = transaction.relationships?.customer?.data?.id?.uuid;
    const listingId = transaction.relationships?.listing?.data?.id?.uuid;
    let studentName = 'Unknown';
    let projectTitle = 'Unknown';

    included.forEach(item => {
      if (item.type === 'user' && item.id.uuid === customerId) {
        studentName = item.attributes.profile.displayName;
      }
      if (item.type === 'listing' && item.id.uuid === listingId) {
        projectTitle = item.attributes.title;
      }
    });

    res.status(200).json({
      success: true,
      message: `Work hold cleared for ${studentName} on project "${projectTitle}". The student can now proceed with work.`,
      transactionId,
      workHoldClearedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin clear work hold error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/corporate-deposits/:transactionId/reinstate-hold
 *
 * Reinstate the work hold for a transaction (in case of issues).
 */
async function reinstateWorkHold(req, res) {
  const { transactionId } = req.params;
  const { reason } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(transactionId)) {
    return res.status(400).json({ error: 'Invalid transaction ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
    });

    const transaction = txResponse.data.data;
    const currentMetadata = transaction.attributes.metadata || {};

    // Update transaction metadata to reinstate the hold
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        workHoldCleared: false,
        workHoldReinstatedAt: new Date().toISOString(),
        workHoldReinstatedBy: admin.id.uuid,
        workHoldReinstateReason: reason || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Work hold reinstated. The student cannot proceed with work until hold is cleared.',
      transactionId,
    });
  } catch (error) {
    console.error('Admin reinstate work hold error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/corporate-deposits/:partnerId/clear-all-holds
 *
 * Clear work holds for all pending transactions for a corporate partner.
 * Useful when a partner has paid their deposit for all projects.
 */
async function clearAllHoldsForPartner(req, res) {
  const { partnerId } = req.params;
  const { notes } = req.body;

  if (!partnerId) {
    return res.status(400).json({ error: 'Partner ID is required.' });
  }

  // Security: Validate UUID format
  if (!UUID_REGEX.test(partnerId)) {
    return res.status(400).json({ error: 'Invalid partner ID format.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Get all transactions for this partner
    const txResponse = await integrationSdk.transactions.query({
      providerId: partnerId,
      perPage: 100,
    });

    const transactions = txResponse.data.data || [];
    let clearedCount = 0;

    for (const tx of transactions) {
      const metadata = tx.attributes.metadata || {};
      const lastTransition = tx.attributes.lastTransition;

      // Only clear hold on accepted transactions that don't have hold cleared
      if (lastTransition?.includes('accept') && !metadata.workHoldCleared) {
        await integrationSdk.transactions.updateMetadata({
          id: tx.id.uuid,
          metadata: {
            ...metadata,
            workHoldCleared: true,
            workHoldClearedAt: new Date().toISOString(),
            workHoldClearedBy: admin.id.uuid,
            workHoldClearedNotes: notes || 'Bulk clear by admin',
            depositConfirmed: metadata.depositConfirmed || true,
            depositConfirmedAt: metadata.depositConfirmedAt || new Date().toISOString(),
            depositConfirmedBy: metadata.depositConfirmedBy || admin.id.uuid,
          },
        });
        clearedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleared work holds for ${clearedCount} transaction(s).`,
      clearedCount,
    });
  } catch (error) {
    console.error('Admin clear all holds error:', error);
    handleError(res, error);
  }
}

module.exports = {
  list: listCorporateDeposits,
  getPartner: getCorporatePartnerDeposits,
  clearHold: clearWorkHold,
  reinstateHold: reinstateWorkHold,
  clearAllHolds: clearAllHoldsForPartner,
};
