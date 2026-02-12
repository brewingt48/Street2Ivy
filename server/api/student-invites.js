const { getSdk, handleError, serialize } = require('../api-util/sdk');
const db = require('../api-util/db');

/**
 * GET /api/student/invites
 *
 * Fetches all invitations for the current student user.
 * Returns invites from the corporate_invites table where the
 * student_id matches the current user.
 *
 * Query params:
 *   status - Filter by invite status (pending, accepted, declined)
 */
const listStudentInvites = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const currentUserId = currentUser.id.uuid;

    const { status } = req.query;

    const invites = db.corporateInvites.getByStudentId(currentUserId, {
      status: status || undefined,
    });

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: { invites },
        })
      )
      .end();
  } catch (e) {
    console.error('Error fetching student invites:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/student/invites/:inviteId/accept
 *
 * Student accepts an invitation. This updates the invite status
 * in the database. The student should then be redirected to apply
 * for the project listing directly.
 */
const acceptInvite = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const currentUserId = currentUser.id.uuid;

    const { inviteId } = req.params;

    // Verify the invite exists and belongs to this student
    const invite = db.corporateInvites.getById(inviteId);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found.' });
    }
    if (invite.studentId !== currentUserId) {
      return res.status(403).json({ error: 'This invite is not for you.' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({
        error: `This invite has already been ${invite.status}.`,
      });
    }

    // Update the invite status
    const updated = db.corporateInvites.updateStatusById(inviteId, 'accepted');

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: {
            invite: updated,
            listingId: invite.listingId,
            message: 'Invite accepted! You can now apply to this project.',
          },
        })
      )
      .end();
  } catch (e) {
    console.error('Error accepting invite:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/student/invites/:inviteId/decline
 *
 * Student declines an invitation.
 */
const declineInvite = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const currentUserId = currentUser.id.uuid;

    const { inviteId } = req.params;

    // Verify the invite exists and belongs to this student
    const invite = db.corporateInvites.getById(inviteId);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found.' });
    }
    if (invite.studentId !== currentUserId) {
      return res.status(403).json({ error: 'This invite is not for you.' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({
        error: `This invite has already been ${invite.status}.`,
      });
    }

    // Update the invite status
    const updated = db.corporateInvites.updateStatusById(inviteId, 'declined');

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: {
            invite: updated,
            message: 'Invite declined.',
          },
        })
      )
      .end();
  } catch (e) {
    console.error('Error declining invite:', e);
    handleError(res, e);
  }
};

module.exports = {
  listStudentInvites,
  acceptInvite,
  declineInvite,
};
