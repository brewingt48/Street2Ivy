const { getTrustedSdk, getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { notifyInviteToApply } = require('../api-util/notifications');
const { storeInvite } = require('./corporate-invites');

// Security: UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * POST /api/invite-to-apply
 *
 * Allows a corporate partner (provider) to invite a student to apply
 * for one of their project listings.
 *
 * Since Sharetribe requires the customer to initiate transactions,
 * we use the trusted SDK (server-side with CLIENT_SECRET) to initiate
 * the transaction on behalf of the student.
 *
 * Body params (Transit-encoded):
 *   studentId  - UUID of the student to invite
 *   listingId  - UUID of the project listing
 *   message    - Invitation message text
 */
module.exports = (req, res) => {
  const { studentId, listingId, message } = req.body || {};

  if (!studentId || !listingId) {
    return res.status(400).json({
      error: 'studentId and listingId are required.',
    });
  }

  // Security: Validate UUID formats
  if (!UUID_REGEX.test(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID format.' });
  }
  if (!UUID_REGEX.test(listingId)) {
    return res.status(400).json({ error: 'Invalid listing ID format.' });
  }

  // Security: Validate message length if provided
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  const sdk = getSdk(req, res);

  // Step 1: Verify the current user is the listing author
  sdk.currentUser
    .show()
    .then(currentUserResponse => {
      const currentUser = currentUserResponse.data.data;
      const currentUserId = currentUser.id.uuid;

      // Step 2: Verify the listing belongs to the current user and is published
      return sdk.ownListings.show({ id: listingId }).then(listingResponse => {
        const listing = listingResponse.data.data;
        const listingState = listing.attributes.state;
        const processAlias = listing.attributes.publicData?.transactionProcessAlias;

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

        if (!processAlias) {
          const error = new Error('Listing does not have a transaction process configured.');
          error.status = 400;
          error.statusText = error.message;
          error.data = {};
          throw error;
        }

        // Step 3: Use trusted SDK to initiate transaction on behalf of the student
        return getTrustedSdk(req).then(trustedSdk => {
          const bodyParams = {
            transition: 'transition/apply',
            processAlias,
            params: {
              listingId,
            },
          };

          // The trusted SDK initiates the transaction.
          // The student becomes the customer, the listing author becomes the provider.
          return trustedSdk.transactions.initiate(bodyParams).then(txResponse => {
            const transactionId = txResponse.data.data.id;

            // Step 4: Send the invitation message
            const messageContent = message || 'You have been invited to apply for this project.';

            return trustedSdk.messages
              .send({
                transactionId: transactionId,
                content: messageContent,
              })
              .then(async () => {
                // Get student info for notification and invite tracking
                const integrationSdk = getIntegrationSdkForTenant(req.tenant);
                let studentName = 'Student';
                let studentEmail = '';
                let studentUniversity = '';

                try {
                  const studentResponse = await integrationSdk.users.show({ id: studentId });
                  const student = studentResponse.data.data;
                  studentName = student?.attributes?.profile?.displayName || 'Student';
                  studentEmail = student?.attributes?.email || '';
                  studentUniversity = student?.attributes?.profile?.publicData?.university || '';

                  // Send notification to student
                  await notifyInviteToApply({
                    studentId,
                    studentEmail,
                    studentName,
                    companyName: currentUser?.attributes?.profile?.displayName || 'Company',
                    projectTitle: listing?.attributes?.title || 'Project',
                    projectDescription: listing?.attributes?.description || '',
                    listingId,
                  });
                } catch (notifErr) {
                  console.error('Failed to send invite notification:', notifErr);
                  // Don't fail the request if notification fails
                }

                // Store the invite for tracking
                try {
                  storeInvite({
                    corporatePartnerId: currentUserId,
                    studentId,
                    studentName,
                    studentEmail,
                    studentUniversity,
                    listingId,
                    projectTitle: listing?.attributes?.title || 'Project',
                    message: messageContent,
                    transactionId: transactionId.uuid,
                  });
                } catch (storeErr) {
                  console.error('Failed to store invite record:', storeErr);
                  // Don't fail the request if storing fails
                }

                res
                  .status(200)
                  .set('Content-Type', 'application/transit+json')
                  .send(
                    serialize({
                      status: 200,
                      statusText: 'OK',
                      data: {
                        transactionId: transactionId.uuid,
                        message: 'Invitation sent successfully',
                        inviteSent: true,
                      },
                    })
                  )
                  .end();
              });
          });
        });
      });
    })
    .catch(e => {
      console.error('invite-to-apply error:', e);
      handleError(res, e);
    });
};
