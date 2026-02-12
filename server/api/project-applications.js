const crypto = require('crypto');
const db = require('../api-util/db');
const { getSdk, handleError, serialize } = require('../api-util/sdk');

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

    res.status(201).json({
      success: true,
      application: {
        id: applicationId,
        transactionId,
        status: 'pending',
        submittedAt: application.submittedAt,
      },
    });
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

    res.status(200).json({
      success: true,
      application: updated,
    });
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

    res.status(200).json({
      success: true,
      application: updated,
    });
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
