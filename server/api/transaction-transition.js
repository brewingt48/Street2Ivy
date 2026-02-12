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
const db = require('../api-util/db');

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

      // Sync SQLite project_applications status when transition matches
      const txIdStr = typeof transactionId === 'string' ? transactionId : transactionId?.uuid || transactionId;
      const statusMap = {
        'transition/accept': 'accepted',
        'transition/decline': 'declined',
        'transition/mark-completed': 'completed',
      };

      const newStatus = statusMap[transition];
      if (newStatus) {
        try {
          const app = db.projectApplications.getByTransactionId(txIdStr);
          if (app) {
            db.projectApplications.updateStatus(app.id, newStatus);
            console.log(`[TransactionTransition] Synced SQLite: application ${app.id} → ${newStatus}`);
          }
        } catch (dbErr) {
          // Non-critical: SQLite sync failure should not block the transition response
          console.error('[TransactionTransition] Failed to sync SQLite:', dbErr.message);
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
