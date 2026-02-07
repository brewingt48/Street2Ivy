/**
 * Transaction Transition API
 *
 * This endpoint handles simple transaction transitions (accept, decline, etc.)
 * for processes that don't require privileged operations (like line item calculation).
 *
 * Used by: Student Dashboard (accepting/declining invites)
 */

const { getSdk, handleError, serialize } = require('../api-util/sdk');

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

  // Perform the transition
  sdk.transactions
    .transition(
      {
        id: transactionId,
        transition,
        params,
      },
      { expand: true }
    )
    .then(response => {
      const { status, statusText, data } = response;

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
