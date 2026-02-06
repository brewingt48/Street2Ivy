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
 * GET /api/admin/deposits
 *
 * Get all transactions awaiting deposit confirmation.
 */
async function listPendingDeposits(req, res) {
  const { page = '1', perPage = '20' } = req.query;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdk();

    // Query transactions that are in 'applied' state (awaiting acceptance)
    // and don't have deposit confirmed yet
    const txResponse = await integrationSdk.transactions.query({
      lastTransition: 'transition/apply',
      include: ['listing', 'provider', 'customer'],
      perPage: parseInt(perPage, 10),
      page: parseInt(page, 10),
    });

    const transactions = txResponse.data.data;
    const included = txResponse.data.included || [];

    // Build lookup maps for included data
    const listingsMap = {};
    const usersMap = {};
    included.forEach(item => {
      if (item.type === 'listing') {
        listingsMap[item.id.uuid] = item;
      } else if (item.type === 'user') {
        usersMap[item.id.uuid] = item;
      }
    });

    // Filter to only those awaiting deposit
    const pendingDeposits = transactions
      .filter(tx => {
        const metadata = tx.attributes.metadata || {};
        return !metadata.depositConfirmed;
      })
      .map(tx => {
        const listingId = tx.relationships?.listing?.data?.id?.uuid;
        const providerId = tx.relationships?.provider?.data?.id?.uuid;
        const customerId = tx.relationships?.customer?.data?.id?.uuid;

        const listing = listingsMap[listingId];
        const provider = usersMap[providerId];
        const customer = usersMap[customerId];

        return {
          id: tx.id.uuid,
          createdAt: tx.attributes.createdAt,
          lastTransition: tx.attributes.lastTransition,
          metadata: tx.attributes.metadata || {},
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
                email: provider.attributes.email,
                companyName: provider.attributes.profile.publicData?.companyName,
              }
            : null,
          customer: customer
            ? {
                id: customer.id.uuid,
                displayName: customer.attributes.profile.displayName,
                email: customer.attributes.email,
              }
            : null,
        };
      });

    res.status(200).json({
      deposits: pendingDeposits,
      pagination: {
        totalItems: pendingDeposits.length,
        page: parseInt(page, 10),
        perPage: parseInt(perPage, 10),
      },
    });
  } catch (error) {
    console.error('Admin list pending deposits error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/deposits/:transactionId/confirm
 *
 * Confirm that deposit has been received for a transaction.
 * This allows the corporate partner to accept the student.
 */
async function confirmDeposit(req, res) {
  const { transactionId } = req.params;
  const { amount, paymentMethod, notes } = req.body;

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

    // Update transaction metadata to mark deposit as confirmed
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        depositConfirmed: true,
        depositConfirmedAt: new Date().toISOString(),
        depositConfirmedBy: admin.id.uuid,
        depositAmount: amount || null,
        depositPaymentMethod: paymentMethod || 'offline',
        depositNotes: notes || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deposit confirmed successfully. Corporate partner can now accept the student.',
      transactionId,
    });
  } catch (error) {
    console.error('Admin confirm deposit error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/deposits/:transactionId/revoke
 *
 * Revoke deposit confirmation (in case of error or refund).
 */
async function revokeDeposit(req, res) {
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

    // Update transaction metadata to revoke deposit confirmation
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        depositConfirmed: false,
        depositRevokedAt: new Date().toISOString(),
        depositRevokedBy: admin.id.uuid,
        depositRevokeReason: reason || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deposit confirmation revoked.',
      transactionId,
    });
  } catch (error) {
    console.error('Admin revoke deposit error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/deposits/:transactionId
 *
 * Get deposit status for a specific transaction.
 */
async function getDepositStatus(req, res) {
  const { transactionId } = req.params;

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

    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['listing', 'provider', 'customer'],
    });

    const transaction = txResponse.data.data;
    const metadata = transaction.attributes.metadata || {};

    res.status(200).json({
      transactionId,
      depositConfirmed: metadata.depositConfirmed || false,
      depositConfirmedAt: metadata.depositConfirmedAt || null,
      depositAmount: metadata.depositAmount || null,
      depositPaymentMethod: metadata.depositPaymentMethod || null,
      depositNotes: metadata.depositNotes || null,
    });
  } catch (error) {
    console.error('Admin get deposit status error:', error);
    handleError(res, error);
  }
}

module.exports = {
  list: listPendingDeposits,
  confirm: confirmDeposit,
  revoke: revokeDeposit,
  status: getDepositStatus,
};
