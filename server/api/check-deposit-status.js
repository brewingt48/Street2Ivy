const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/check-deposit-status/:transactionId
 *
 * Check if deposit has been confirmed for a transaction.
 * This is used by corporate partners to know if they can accept students.
 *
 * Returns:
 * - depositRequired: boolean
 * - depositConfirmed: boolean
 * - canAcceptStudent: boolean
 * - message: string
 */
async function checkDepositStatus(req, res) {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  try {
    // Verify user is authenticated
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['provider', 'listing'],
    });

    const transaction = txResponse.data.data;

    // Verify the current user is the provider (corporate partner)
    const providerId = transaction.relationships?.provider?.data?.id?.uuid;
    if (providerId !== currentUser.id.uuid) {
      return res.status(403).json({
        error: 'You are not authorized to view this transaction.',
      });
    }

    const metadata = transaction.attributes.metadata || {};
    const depositConfirmed = metadata.depositConfirmed === true;

    // For Street2Ivy, deposits are always required for project applications
    const depositRequired = true;
    const canAcceptStudent = !depositRequired || depositConfirmed;

    let message;
    if (!depositRequired) {
      message = 'No deposit required. You can accept students.';
    } else if (depositConfirmed) {
      message = 'Deposit confirmed. You can accept this student.';
    } else {
      message =
        'Please contact Street2Ivy to submit your deposit before accepting this student. Your deposit ensures payment to students upon project completion.';
    }

    res.status(200).json({
      transactionId,
      depositRequired,
      depositConfirmed,
      canAcceptStudent,
      message,
      depositConfirmedAt: metadata.depositConfirmedAt || null,
    });
  } catch (error) {
    console.error('Check deposit status error:', error);
    handleError(res, error);
  }
}

module.exports = checkDepositStatus;
