/**
 * Transaction Transition API
 *
 * This endpoint handles simple transaction transitions (accept, decline, etc.)
 * for processes that don't require privileged operations (like line item calculation).
 *
 * Used by: Student Dashboard (accepting/declining invites)
 */

const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { types: sdkTypes } = require('sharetribe-flex-sdk');
const { UUID } = sdkTypes;
const { sendNotification, NOTIFICATION_TYPES } = require('../api-util/notifications');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');

module.exports = (req, res) => {
  const { transactionId, transition, params = {} } = req.body || {};

  // Validate required parameters
  if (!transactionId) {
    return res.status(400).json({ error: 'Missing required parameter: transactionId' });
  }

  if (!transition) {
    return res.status(400).json({ error: 'Missing required parameter: transition' });
  }

  // Validate transition is one of the allowed simple transitions
  const allowedTransitions = [
    'transition/accept',
    'transition/decline',
    'transition/mark-completed',
    'transition/cancel',
    'transition/request-project-application',
  ];

  if (!allowedTransitions.includes(transition)) {
    return res.status(400).json({
      error: `Invalid transition. Allowed transitions: ${allowedTransitions.join(', ')}`,
    });
  }

  // Get the SDK with the current user's credentials
  const sdk = getSdk(req, res);

  // Ensure the transactionId is a UUID object (handle both transit-deserialized UUIDs and raw strings)
  const txId = transactionId instanceof UUID ? transactionId : new UUID(transactionId);

  // Perform the transition
  sdk.transactions
    .transition(
      {
        id: txId,
        transition,
        params,
      },
      { expand: true }
    )
    .then(async response => {
      const { status, statusText, data } = response;

      // Send notification when a project is marked as completed
      if (transition === 'transition/mark-completed') {
        try {
          const integrationSdk = getIntegrationSdkForTenant(req);
          const txData = data?.data;
          const customerId = txData?.relationships?.customer?.data?.id?.uuid;
          const listingId = txData?.relationships?.listing?.data?.id?.uuid;

          if (customerId && listingId) {
            // Fetch listing and customer info for notification
            const [listingRes, customerRes] = await Promise.all([
              integrationSdk.listings.show({ id: new UUID(listingId) }),
              integrationSdk.users.show({ id: new UUID(customerId) }),
            ]);
            const projectTitle = listingRes?.data?.data?.attributes?.title || 'Unknown Project';
            const studentName = customerRes?.data?.data?.attributes?.profile?.displayName || 'Student';

            await sendNotification({
              type: NOTIFICATION_TYPES.PROJECT_COMPLETED,
              recipientId: customerId,
              data: {
                projectTitle,
                studentName,
                message: `The project "${projectTitle}" has been marked as completed! You can now leave a review for the corporate partner.`,
              },
            });
          }
        } catch (notifyErr) {
          console.error('[TransactionTransition] Failed to send completion notification:', notifyErr);
        }
      }

      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
