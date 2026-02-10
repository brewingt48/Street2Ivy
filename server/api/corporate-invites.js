const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { verifyCorporatePartnerApproved } = require('../api-util/corporateApproval');

/**
 * In-memory invite store for tracking sent invitations
 * In production, this would be stored in a database
 *
 * Structure: Map<corporatePartnerId, Array<InviteRecord>>
 *
 * InviteRecord: {
 *   id: string,
 *   studentId: string,
 *   studentName: string,
 *   studentEmail: string,
 *   studentUniversity: string,
 *   listingId: string,
 *   projectTitle: string,
 *   message: string,
 *   transactionId: string,
 *   status: 'pending' | 'accepted' | 'declined' | 'expired',
 *   sentAt: string (ISO date),
 *   respondedAt: string | null (ISO date),
 * }
 */
const inviteStore = new Map();

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
  const invites = inviteStore.get(corporatePartnerId) || [];

  const inviteRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  invites.unshift(inviteRecord);

  // Keep only last 100 invites per corporate partner
  if (invites.length > 100) {
    invites.length = 100;
  }

  inviteStore.set(corporatePartnerId, invites);

  return inviteRecord;
}

/**
 * Update invite status when student responds
 */
function updateInviteStatus(corporatePartnerId, transactionId, status) {
  const invites = inviteStore.get(corporatePartnerId) || [];
  const invite = invites.find(i => i.transactionId === transactionId);

  if (invite) {
    invite.status = status;
    invite.respondedAt = new Date().toISOString();
  }

  return invite;
}

/**
 * Get all invites for a corporate partner
 */
function getInvites(corporatePartnerId, { status, limit = 50 } = {}) {
  const invites = inviteStore.get(corporatePartnerId) || [];

  let filtered = invites;
  if (status) {
    filtered = invites.filter(i => i.status === status);
  }

  return filtered.slice(0, limit);
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
    const invites = getInvites(currentUserId, {});
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
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
  // This would re-trigger the invite-to-apply flow
  // For now, return not implemented
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
