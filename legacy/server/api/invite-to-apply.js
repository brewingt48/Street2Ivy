const sharetribeSdk = require('sharetribe-flex-sdk');
const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { notifyInviteToApply } = require('../api-util/notifications');
const { storeInvite } = require('./corporate-invites');

const { UUID } = sharetribeSdk.types;

// Security: UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * POST /api/invite-to-apply
 *
 * Allows a corporate partner (provider) to invite a student to apply
 * for one of their project listings.
 *
 * Instead of creating a Sharetribe transaction directly (which would fail
 * because the listing author can't also be the transaction customer),
 * we store the invitation and notify the student. The student can then
 * accept the invite and initiate the transaction themselves.
 *
 * Body params (Transit-encoded):
 *   studentId  - UUID of the student to invite
 *   listingId  - UUID of the project listing
 *   message    - Invitation message text
 */
module.exports = (req, res) => {
  const body = req.body || {};
  // Handle both string IDs and UUID objects (Transit deserialization may produce either)
  const rawStudentId = body.studentId;
  const rawListingId = body.listingId;
  const message = body.message;

  // Extract string UUID from either a UUID object or plain string
  const studentIdStr = rawStudentId?.uuid || rawStudentId;
  const listingIdStr = rawListingId?.uuid || rawListingId;

  if (!studentIdStr || !listingIdStr) {
    return res.status(400).json({
      error: 'studentId and listingId are required.',
    });
  }

  // Security: Validate UUID formats
  if (!UUID_REGEX.test(studentIdStr)) {
    return res.status(400).json({ error: 'Invalid student ID format.' });
  }
  if (!UUID_REGEX.test(listingIdStr)) {
    return res.status(400).json({ error: 'Invalid listing ID format.' });
  }

  // Security: Validate message length if provided
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  // Create proper UUID objects for SDK calls
  const studentUUID = new UUID(studentIdStr);
  const listingUUID = new UUID(listingIdStr);

  const sdk = getSdk(req, res);

  // Step 1: Verify the current user is the listing author
  sdk.currentUser
    .show()
    .then(currentUserResponse => {
      const currentUser = currentUserResponse.data.data;
      const currentUserId = currentUser.id.uuid;

      // Step 2: Verify the listing belongs to the current user and is published
      return sdk.ownListings.show({ id: listingUUID }).then(async listingResponse => {
        const listing = listingResponse.data.data;
        const listingState = listing.attributes.state;

        // Listing must be published to send invitations
        if (listingState !== 'published') {
          const error = new Error(
            `This project must be published before you can send invitations. Current status: ${listingState || 'draft'}. Please publish the project first.`
          );
          error.status = 400;
          error.statusText = error.message;
          error.data = { listingState };
          throw error;
        }

        // Step 3: Get student info for notification and invite tracking
        const integrationSdk = getIntegrationSdkForTenant(req.tenant);
        let studentName = 'Student';
        let studentEmail = '';
        let studentUniversity = '';

        try {
          const studentResponse = await integrationSdk.users.show({ id: studentUUID });
          const student = studentResponse.data.data;
          studentName = student?.attributes?.profile?.displayName || 'Student';
          studentEmail = student?.attributes?.email || '';
          studentUniversity = student?.attributes?.profile?.publicData?.university || '';
        } catch (studentErr) {
          console.error('Failed to fetch student info:', studentErr);
          // Continue with default values — don't fail the invite
        }

        const messageContent = message || 'You have been invited to apply for this project.';

        // Step 4: Store the invite record
        let inviteRecord;
        try {
          inviteRecord = storeInvite({
            corporatePartnerId: currentUserId,
            studentId: studentIdStr,
            studentName,
            studentEmail,
            studentUniversity,
            listingId: listingIdStr,
            projectTitle: listing?.attributes?.title || 'Project',
            message: messageContent,
            transactionId: null, // Transaction will be created when student accepts
          });
        } catch (storeErr) {
          console.error('Failed to store invite record:', storeErr);
          const error = new Error('Failed to store invitation. Please try again.');
          error.status = 500;
          error.statusText = error.message;
          throw error;
        }

        // Step 5: Send notification to student
        try {
          await notifyInviteToApply({
            studentId: studentIdStr,
            studentEmail,
            studentName,
            companyName: currentUser?.attributes?.profile?.displayName || 'Company',
            projectTitle: listing?.attributes?.title || 'Project',
            projectDescription: listing?.attributes?.description || '',
            listingId: listingIdStr,
          });
        } catch (notifErr) {
          console.error('Failed to send invite notification:', notifErr);
          // Don't fail the request if notification fails — the invite is stored
        }

        res
          .status(200)
          .set('Content-Type', 'application/transit+json')
          .send(
            serialize({
              status: 200,
              statusText: 'OK',
              data: {
                inviteId: inviteRecord.id,
                message: 'Invitation sent successfully',
                inviteSent: true,
              },
            })
          )
          .end();
      });
    })
    .catch(e => {
      console.error('invite-to-apply error:', e);
      handleError(res, e);
    });
};
