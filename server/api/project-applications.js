const crypto = require('crypto');
const db = require('../api-util/db');
const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { sendNotification, NOTIFICATION_TYPES, notifyTransactionStateChange } = require('../api-util/notifications');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/project-applications
 *
 * Student submits a project application. Stores detailed application data
 * in SQLite and creates a Sharetribe transaction for the state machine.
 *
 * Body (JSON):
 *   listingId       - UUID of the project listing
 *   inviteId        - (optional) ID of the corporate invite being accepted
 *   coverLetter     - Cover letter / introduction message
 *   resumeAttachmentId - (optional) ID of uploaded resume attachment
 *   availabilityDate - When the student can start
 *   interestReason  - Why they're interested in the project
 *   skills          - Array of relevant skills
 *   relevantCoursework - Relevant coursework description
 *   gpa             - GPA (string, e.g. "3.7")
 *   hoursPerWeek    - Hours available per week
 *   referencesText  - References or reference contacts
 */
const submitApplication = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const studentId = currentUser.id.uuid;

    const {
      listingId,
      inviteId,
      coverLetter,
      resumeAttachmentId,
      availabilityDate,
      interestReason,
      skills,
      relevantCoursework,
      gpa,
      hoursPerWeek,
      referencesText,
    } = req.body;

    // Validation
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required.' });
    }

    const listingIdStr = listingId?.uuid || listingId;
    if (!UUID_REGEX.test(listingIdStr)) {
      return res.status(400).json({ error: 'Invalid listing ID format.' });
    }

    if (!coverLetter || coverLetter.trim().length < 20) {
      return res.status(400).json({
        error: 'Cover letter must be at least 20 characters.',
      });
    }

    if (!interestReason || interestReason.trim().length < 10) {
      return res.status(400).json({ error: 'Please explain why you are interested in this project.' });
    }

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Please select at least one relevant skill.' });
    }

    if (!availabilityDate) {
      return res.status(400).json({ error: 'Please provide your availability start date.' });
    }

    if (!hoursPerWeek || parseInt(hoursPerWeek, 10) < 1) {
      return res.status(400).json({ error: 'Please enter hours available per week.' });
    }

    if (!relevantCoursework || relevantCoursework.trim().length < 3) {
      return res.status(400).json({ error: 'Please list your relevant coursework.' });
    }

    if (!referencesText || referencesText.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide at least one reference.' });
    }

    // Check for duplicate application
    const existing = db.projectApplications.getByStudentAndListing(studentId, listingIdStr);
    if (existing && existing.status === 'pending') {
      return res.status(409).json({
        error: 'You already have a pending application for this project.',
        applicationId: existing.id,
      });
    }

    // Generate application ID
    const applicationId = `app_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Create the Sharetribe transaction (inquiry) so the state machine works
    let transactionId = null;
    try {
      const sharetribeSdk = require('sharetribe-flex-sdk');
      const { UUID } = sharetribeSdk.types;

      const txResponse = await sdk.transactions.initiate({
        transition: 'transition/inquire-without-payment',
        processAlias: 'default-project-application/release-1',
        params: {
          listingId: new UUID(listingIdStr),
        },
      });
      transactionId = txResponse.data.data.id.uuid;

      // Send the cover letter as the first message in the transaction
      await sdk.messages.send({
        transactionId: new UUID(transactionId),
        content: coverLetter.trim(),
      });
    } catch (txErr) {
      console.error('Failed to create Sharetribe transaction:', txErr);
      // Continue without transaction — the application data is still stored
    }

    // Store the application in SQLite
    const application = {
      id: applicationId,
      studentId,
      listingId: listingIdStr,
      transactionId,
      inviteId: inviteId || null,
      coverLetter: coverLetter.trim(),
      resumeAttachmentId: resumeAttachmentId || null,
      availabilityDate: availabilityDate || null,
      interestReason: (interestReason || '').trim(),
      skills: Array.isArray(skills) ? skills : [],
      relevantCoursework: (relevantCoursework || '').trim(),
      gpa: (gpa || '').trim(),
      hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek, 10) : null,
      referencesText: (referencesText || '').trim(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    db.projectApplications.create(application);

    // If this was from an invite, update the invite status
    if (inviteId) {
      try {
        db.corporateInvites.updateStatusById(inviteId, 'applied');
      } catch (invErr) {
        console.error('Failed to update invite status:', invErr);
      }
    }

    // Send response immediately so the student isn't waiting on notifications
    res.status(201).json({
      success: true,
      application: {
        id: applicationId,
        transactionId,
        status: 'pending',
        submittedAt: application.submittedAt,
      },
    });

    // Send email/in-app notifications asynchronously (non-blocking)
    // Strategy: Send student confirmation directly (we have all the data).
    // For corporate partner notification, try Integration SDK for their email.
    const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
    const studentName = currentUser.attributes?.profile?.displayName || 'Student';
    const studentEmail = currentUser.attributes?.email;
    const studentUniversity = currentUser.attributes?.profile?.publicData?.university || 'Not specified';
    const studentMajor = currentUser.attributes?.profile?.publicData?.major || 'Not specified';

    // 1) Send confirmation to student (no Integration SDK needed)
    try {
      // Get listing title from the marketplace SDK (student has read access)
      let listingTitle = 'your project';
      try {
        const sharetribeSdk = require('sharetribe-flex-sdk');
        const { UUID } = sharetribeSdk.types;
        const listingResp = await sdk.listings.show({ id: new UUID(listingIdStr) });
        listingTitle = listingResp.data.data.attributes?.title || listingTitle;
      } catch (listErr) {
        console.warn('[ProjectApplications] Could not fetch listing title:', listErr.message);
      }

      await sendNotification({
        type: NOTIFICATION_TYPES.APPLICATION_RECEIVED,
        recipientId: studentId,
        recipientEmail: studentEmail,
        data: {
          studentName,
          projectTitle: listingTitle,
          companyName: 'the corporate partner',
          timeline: 'See project details',
        },
      });
      console.log(`[ProjectApplications] Student confirmation sent to ${studentEmail}`);

      // 2) Try to notify corporate partner (requires Integration SDK for provider email)
      if (transactionId) {
        try {
          const integrationSdk = getIntegrationSdkForTenant(req.tenant);
          const sharetribeSdk = require('sharetribe-flex-sdk');
          const { UUID } = sharetribeSdk.types;

          const fullTxResponse = await integrationSdk.transactions.show({
            id: new UUID(transactionId),
            include: ['listing', 'customer', 'provider'],
          });

          const included = fullTxResponse.data.included || [];
          const provider = included.find(i => i.type === 'user' && i.id.uuid !== studentId);
          const listing = included.find(i => i.type === 'listing');
          const providerEmail = provider?.attributes?.email;
          const providerName = provider?.attributes?.profile?.displayName || 'Team';
          const providerListingTitle = listing?.attributes?.title || listingTitle;

          if (providerEmail) {
            await sendNotification({
              type: NOTIFICATION_TYPES.NEW_APPLICATION,
              recipientId: provider?.id?.uuid,
              recipientEmail: providerEmail,
              data: {
                companyName: providerName,
                projectTitle: providerListingTitle,
                studentName,
                studentUniversity,
                studentMajor,
                applicationUrl: `${baseUrl}/inbox/received`,
              },
            });
            console.log(`[ProjectApplications] Corporate partner notified at ${providerEmail}`);
          } else {
            console.warn('[ProjectApplications] No provider email found — in-app notification only');
          }
        } catch (intSdkError) {
          console.error('[ProjectApplications] Integration SDK error (corporate partner notification skipped):', intSdkError.message);
          console.error('[ProjectApplications] Ensure SHARETRIBE_SDK_CLIENT_SECRET is set in Heroku config vars.');
          console.error('[ProjectApplications] Get it from Sharetribe Console → Build → Applications.');
        }
      }
    } catch (notifError) {
      console.error('[ProjectApplications] Notification error:', notifError.message);
    }
  } catch (e) {
    console.error('Error submitting project application:', e);
    handleError(res, e);
  }
};

/**
 * GET /api/project-applications/:applicationId
 *
 * Fetch a single application by ID. Accessible by the student who
 * submitted it or the corporate partner who owns the listing.
 */
const getApplication = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userId = currentUser.id.uuid;

    const { applicationId } = req.params;
    const application = db.projectApplications.getById(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Verify access: must be the student or the listing owner
    if (application.studentId !== userId) {
      // Check if user is the listing owner
      try {
        const sharetribeSdk = require('sharetribe-flex-sdk');
        const { UUID } = sharetribeSdk.types;
        await sdk.ownListings.show({ id: new UUID(application.listingId) });
        // If no error, the user owns the listing
      } catch (listingErr) {
        return res.status(403).json({ error: 'You do not have access to this application.' });
      }
    }

    // Fetch resume attachment info if exists
    let resumeAttachment = null;
    if (application.resumeAttachmentId) {
      resumeAttachment = db.attachments.getById(application.resumeAttachmentId);
    }

    res.status(200).json({
      application: {
        ...application,
        resumeAttachment: resumeAttachment
          ? {
              id: resumeAttachment.id,
              name: resumeAttachment.originalName,
              size: resumeAttachment.sizeFormatted,
              type: resumeAttachment.fileType,
            }
          : null,
      },
    });
  } catch (e) {
    console.error('Error fetching application:', e);
    handleError(res, e);
  }
};

/**
 * GET /api/project-applications/by-transaction/:transactionId
 *
 * Fetch application data by Sharetribe transaction ID. Used by the
 * ApplicationsPage to display full application details inline.
 */
const getApplicationByTransaction = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userId = currentUser.id.uuid;

    const { transactionId } = req.params;
    const application = db.projectApplications.getByTransactionId(transactionId);

    if (!application) {
      return res.status(404).json({ error: 'No application found for this transaction.' });
    }

    // Verify access: student or listing owner
    if (application.studentId !== userId) {
      try {
        const sharetribeSdk = require('sharetribe-flex-sdk');
        const { UUID } = sharetribeSdk.types;
        await sdk.ownListings.show({ id: new UUID(application.listingId) });
      } catch (listingErr) {
        return res.status(403).json({ error: 'You do not have access to this application.' });
      }
    }

    // Fetch resume info
    let resumeAttachment = null;
    if (application.resumeAttachmentId) {
      resumeAttachment = db.attachments.getById(application.resumeAttachmentId);
    }

    res.status(200).json({
      application: {
        ...application,
        resumeAttachment: resumeAttachment
          ? {
              id: resumeAttachment.id,
              name: resumeAttachment.originalName,
              size: resumeAttachment.sizeFormatted,
              type: resumeAttachment.fileType,
            }
          : null,
      },
    });
  } catch (e) {
    console.error('Error fetching application by transaction:', e);
    handleError(res, e);
  }
};

/**
 * GET /api/project-applications/by-listing/:listingId
 *
 * Fetch all applications for a listing. Only accessible by the listing owner.
 */
const getApplicationsByListing = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const { listingId } = req.params;

    // Verify listing ownership
    const sharetribeSdk = require('sharetribe-flex-sdk');
    const { UUID } = sharetribeSdk.types;
    try {
      await sdk.ownListings.show({ id: new UUID(listingId) });
    } catch (listingErr) {
      return res.status(403).json({ error: 'You do not own this listing.' });
    }

    const { status } = req.query;
    const applications = db.projectApplications.getByListingId(listingId, {
      status: status || undefined,
    });

    res.status(200).json({ applications });
  } catch (e) {
    console.error('Error fetching applications by listing:', e);
    handleError(res, e);
  }
};

/**
 * GET /api/student/applications
 *
 * Fetch all applications submitted by the current student.
 */
const getStudentApplications = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const studentId = currentUser.id.uuid;

    const { status } = req.query;
    const applications = db.projectApplications.getByStudentId(studentId, {
      status: status || undefined,
    });

    res.status(200).json({ applications });
  } catch (e) {
    console.error('Error fetching student applications:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/project-applications/:applicationId/accept
 *
 * Corporate partner accepts an application. Also transitions the
 * Sharetribe transaction if one exists.
 */
const acceptApplication = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const { applicationId } = req.params;
    const { reviewerNotes } = req.body || {};

    const application = db.projectApplications.getById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Verify listing ownership
    const sharetribeSdk = require('sharetribe-flex-sdk');
    const { UUID } = sharetribeSdk.types;
    try {
      await sdk.ownListings.show({ id: new UUID(application.listingId) });
    } catch (listingErr) {
      return res.status(403).json({ error: 'You do not own this project.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        error: `Application has already been ${application.status}.`,
      });
    }

    // Update application status in SQLite
    const updated = db.projectApplications.updateStatus(applicationId, 'accepted', reviewerNotes);

    // Transition the Sharetribe transaction
    if (application.transactionId) {
      try {
        await sdk.transactions.transition({
          id: new UUID(application.transactionId),
          transition: 'transition/accept',
          params: {},
        });
      } catch (txErr) {
        console.error('Failed to transition Sharetribe transaction:', txErr);
        // Application is already accepted in our DB
      }
    }

    // Send response immediately
    res.status(200).json({
      success: true,
      application: updated,
    });

    // Send email/in-app notification asynchronously
    // Try Integration SDK for full transaction data; fall back to direct notification
    if (application.transactionId) {
      try {
        const integrationSdk = getIntegrationSdkForTenant(req.tenant);
        const fullTxResponse = await integrationSdk.transactions.show({
          id: new UUID(application.transactionId),
          include: ['listing', 'customer', 'provider'],
        });

        const transaction = fullTxResponse.data.data;
        const included = fullTxResponse.data.included || [];
        const listing = included.find(i => i.type === 'listing');
        const customer = included.find(
          i => i.type === 'user' && i.id.uuid === transaction.relationships?.customer?.data?.id?.uuid
        );
        const provider = included.find(
          i => i.type === 'user' && i.id.uuid === transaction.relationships?.provider?.data?.id?.uuid
        );

        await notifyTransactionStateChange({
          transaction,
          transition: 'transition/accept',
          customer,
          provider,
          listing,
        });
      } catch (intSdkError) {
        console.error('[ProjectApplications] Integration SDK error on accept:', intSdkError.message);
        console.error('[ProjectApplications] Ensure SHARETRIBE_SDK_CLIENT_SECRET is set.');
        // Fallback: Send notification using what we know from SQLite application data
        try {
          let listingTitle = 'your project';
          try {
            const listingResp = await sdk.listings.show({ id: new UUID(application.listingId) });
            listingTitle = listingResp.data.data.attributes?.title || listingTitle;
          } catch (_) { /* non-critical */ }

          await sendNotification({
            type: NOTIFICATION_TYPES.APPLICATION_ACCEPTED,
            recipientId: application.studentId,
            recipientEmail: null, // We don't have the student's email without Integration SDK
            data: {
              studentName: 'there',
              projectTitle: listingTitle,
              companyName: 'the project team',
            },
          });
          console.log('[ProjectApplications] Fallback accept notification stored (in-app only, no email)');
        } catch (fallbackErr) {
          console.error('[ProjectApplications] Fallback notification also failed:', fallbackErr.message);
        }
      }
    }
  } catch (e) {
    console.error('Error accepting application:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/project-applications/:applicationId/decline
 *
 * Corporate partner declines an application.
 */
const declineApplication = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const { applicationId } = req.params;
    const { reviewerNotes } = req.body || {};

    const application = db.projectApplications.getById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // Verify listing ownership
    const sharetribeSdk = require('sharetribe-flex-sdk');
    const { UUID } = sharetribeSdk.types;
    try {
      await sdk.ownListings.show({ id: new UUID(application.listingId) });
    } catch (listingErr) {
      return res.status(403).json({ error: 'You do not own this project.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        error: `Application has already been ${application.status}.`,
      });
    }

    // Update application status
    const updated = db.projectApplications.updateStatus(applicationId, 'declined', reviewerNotes);

    // Transition the Sharetribe transaction
    if (application.transactionId) {
      try {
        await sdk.transactions.transition({
          id: new UUID(application.transactionId),
          transition: 'transition/decline',
          params: {},
        });
      } catch (txErr) {
        console.error('Failed to transition Sharetribe transaction:', txErr);
      }
    }

    // Send response immediately
    res.status(200).json({
      success: true,
      application: updated,
    });

    // Send email/in-app notification asynchronously
    if (application.transactionId) {
      try {
        const integrationSdk = getIntegrationSdkForTenant(req.tenant);
        const fullTxResponse = await integrationSdk.transactions.show({
          id: new UUID(application.transactionId),
          include: ['listing', 'customer', 'provider'],
        });

        const transaction = fullTxResponse.data.data;
        const included = fullTxResponse.data.included || [];
        const listing = included.find(i => i.type === 'listing');
        const customer = included.find(
          i => i.type === 'user' && i.id.uuid === transaction.relationships?.customer?.data?.id?.uuid
        );
        const provider = included.find(
          i => i.type === 'user' && i.id.uuid === transaction.relationships?.provider?.data?.id?.uuid
        );

        await notifyTransactionStateChange({
          transaction,
          transition: 'transition/decline',
          customer,
          provider,
          listing,
        });
      } catch (intSdkError) {
        console.error('[ProjectApplications] Integration SDK error on decline:', intSdkError.message);
        console.error('[ProjectApplications] Ensure SHARETRIBE_SDK_CLIENT_SECRET is set.');
        // Fallback: store in-app notification
        try {
          let listingTitle = 'your project';
          try {
            const listingResp = await sdk.listings.show({ id: new UUID(application.listingId) });
            listingTitle = listingResp.data.data.attributes?.title || listingTitle;
          } catch (_) { /* non-critical */ }

          const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
          await sendNotification({
            type: NOTIFICATION_TYPES.APPLICATION_DECLINED,
            recipientId: application.studentId,
            recipientEmail: null,
            data: {
              studentName: 'there',
              projectTitle: listingTitle,
              companyName: 'the project team',
              browseProjectsUrl: `${baseUrl}/s`,
            },
          });
          console.log('[ProjectApplications] Fallback decline notification stored (in-app only)');
        } catch (fallbackErr) {
          console.error('[ProjectApplications] Fallback notification also failed:', fallbackErr.message);
        }
      }
    }
  } catch (e) {
    console.error('Error declining application:', e);
    handleError(res, e);
  }
};

module.exports = {
  submitApplication,
  getApplication,
  getApplicationByTransaction,
  getApplicationsByListing,
  getStudentApplications,
  acceptApplication,
  declineApplication,
};
