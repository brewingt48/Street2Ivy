const db = require('../api-util/db');
const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { verifyCorporatePartnerApproved } = require('../api-util/corporateApproval');

/**
 * Store a new invite record when an invitation is sent
 */
function storeInvite({
  corporatePartnerId,
  studentId,
  studentName,
  studentEmail,
  studentUniversity,
  listingId,
  projectTitle,
  message,
  transactionId,
}) {
  const inviteRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    corporatePartnerId,
    studentId,
    studentName: studentName || 'Unknown Student',
    studentEmail: studentEmail || '',
    studentUniversity: studentUniversity || '',
    listingId,
    projectTitle: projectTitle || 'Unknown Project',
    message: message || '',
    transactionId,
    status: 'pending',
    sentAt: new Date().toISOString(),
    respondedAt: null,
  };

  db.corporateInvites.create(inviteRecord);

  return inviteRecord;
}

/**
 * Update invite status when student responds
 */
function updateInviteStatus(corporatePartnerId, transactionId, status) {
  return db.corporateInvites.updateStatus(corporatePartnerId, transactionId, status);
}

/**
 * Get all invites for a corporate partner
 */
function getInvites(corporatePartnerId, { status, limit = 50 } = {}) {
  return db.corporateInvites.getByPartnerId(corporatePartnerId, { status, limit });
}

/**
 * GET /api/corporate/invites
 *
 * Fetches all invitations sent by the current corporate partner
 *
 * Query params:
 *   status - Filter by invite status (pending, accepted, declined, expired)
 *   limit - Max number of invites to return (default: 50)
 */
const listInvites = async (req, res) => {
  try {
    const approvalResult = await verifyCorporatePartnerApproved(req, res);
    if (!approvalResult) {
      return res.status(403).json({
        error: 'Your corporate partner account requires approval before accessing this feature.',
        approvalStatus: 'pending',
      });
    }
    const currentUser = approvalResult.user;
    const currentUserId = currentUser.id.uuid;

    const { status, limit = 50 } = req.query;

    const invites = getInvites(currentUserId, {
      status,
      limit: parseInt(limit, 10),
    });

    // Calculate summary stats
    const allInvites = getInvites(currentUserId, {});
    const stats = {
      total: allInvites.length,
      pending: allInvites.filter(i => i.status === 'pending').length,
      accepted: allInvites.filter(i => i.status === 'accepted').length,
      declined: allInvites.filter(i => i.status === 'declined').length,
      expired: allInvites.filter(i => i.status === 'expired').length,
    };

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: {
            invites,
            stats,
          },
        })
      )
      .end();
  } catch (e) {
    console.error('Error fetching corporate invites:', e);
    handleError(res, e);
  }
};

/**
 * GET /api/corporate/invites/:inviteId
 *
 * Get details of a specific invite
 */
const getInviteDetails = async (req, res) => {
  try {
    const approvalResult = await verifyCorporatePartnerApproved(req, res);
    if (!approvalResult) {
      return res.status(403).json({
        error: 'Your corporate partner account requires approval before accessing this feature.',
        approvalStatus: 'pending',
      });
    }
    const currentUser = approvalResult.user;
    const currentUserId = currentUser.id.uuid;

    const { inviteId } = req.params;

    const invite = db.corporateInvites.getById(inviteId);

    if (!invite || invite.corporatePartnerId !== currentUserId) {
      return res.status(404).json({
        error: 'Invite not found.',
      });
    }

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: invite,
        })
      )
      .end();
  } catch (e) {
    console.error('Error fetching invite details:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/corporate/invites/:inviteId/resend
 *
 * Resend an invitation (creates a new transaction)
 */
const resendInvite = (req, res) => {
  res.status(501).json({
    error: 'Resend functionality not yet implemented.',
  });
};

module.exports = {
  listInvites,
  getInviteDetails,
  resendInvite,
  // Export these for use by invite-to-apply.js
  storeInvite,
  updateInviteStatus,
  getInvites,
};
