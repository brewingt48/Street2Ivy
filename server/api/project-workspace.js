const crypto = require('crypto');
const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/project-workspace/:transactionId
 *
 * Get project workspace data for a student who has been accepted and deposit confirmed.
 * This endpoint returns confidential project details that are only accessible after:
 * 1. Student has been accepted (transaction in 'accepted' state or later)
 * 2. Deposit has been confirmed by admin
 *
 * Returns:
 * - transaction: Full transaction details
 * - listing: Listing with confidential details
 * - messages: Secure project messages
 * - accessGranted: boolean
 * - accessDeniedReason: string (if access denied)
 */
async function getProjectWorkspace(req, res) {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  try {
    // Verify user is authenticated
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction with all related data
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['provider', 'customer', 'listing'],
    });

    const transaction = txResponse.data.data;
    const included = txResponse.data.included || [];

    // Build lookup maps
    const usersMap = {};
    let listing = null;
    included.forEach(item => {
      if (item.type === 'user') {
        usersMap[item.id.uuid] = item;
      } else if (item.type === 'listing') {
        listing = item;
      }
    });

    const customerId = transaction.relationships?.customer?.data?.id?.uuid;
    const providerId = transaction.relationships?.provider?.data?.id?.uuid;
    const customer = usersMap[customerId];
    const provider = usersMap[providerId];

    // Check if current user is authorized (must be the student/customer or provider)
    const isCustomer = customerId === currentUser.id.uuid;
    const isProvider = providerId === currentUser.id.uuid;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({
        error: 'You are not authorized to access this project workspace.',
        accessGranted: false,
        accessDeniedReason: 'unauthorized',
      });
    }

    const metadata = transaction.attributes.metadata || {};
    const lastTransition = transaction.attributes.lastTransition;

    // Check transaction state - must be accepted or later
    const acceptedStates = ['transition/accept', 'transition/complete', 'transition/review'];
    const isAccepted = acceptedStates.some(
      state => lastTransition === state || lastTransition?.includes('accept')
    );

    // For students, check if work hold has been cleared
    // workHoldCleared is the primary check - it means admin has verified deposit and allowed work
    const workHoldCleared = metadata.workHoldCleared === true;
    const depositConfirmed = metadata.depositConfirmed === true;

    // Determine access level
    let accessGranted = false;
    let accessDeniedReason = null;
    let accessLevel = 'none';

    if (isProvider) {
      // Corporate partners always have full access to their own projects
      accessGranted = true;
      accessLevel = 'full';
    } else if (isCustomer) {
      // Students need to be accepted AND work hold cleared (deposit verified)
      if (!isAccepted) {
        accessDeniedReason = 'not_accepted';
      } else if (!workHoldCleared) {
        // Show deposit pending message - work is blocked until admin clears hold
        accessDeniedReason = 'deposit_pending';
      } else {
        accessGranted = true;
        accessLevel = 'full';
      }
    }

    if (!accessGranted) {
      return res.status(403).json({
        accessGranted: false,
        accessDeniedReason,
        transactionId,
        transactionState: lastTransition,
        depositConfirmed,
        workHoldCleared,
        message: getAccessDeniedMessage(accessDeniedReason),
      });
    }

    // Get project messages from transaction metadata
    const projectMessages = metadata.projectMessages || [];

    // Get confidential listing details
    const listingPublicData = listing?.attributes?.publicData || {};
    const listingPrivateData = listing?.attributes?.privateData || {};

    // Build response with full workspace data
    const workspaceData = {
      accessGranted: true,
      accessLevel,
      transactionId,
      transaction: {
        id: transaction.id.uuid,
        lastTransition,
        createdAt: transaction.attributes.createdAt,
        metadata: {
          depositConfirmed: metadata.depositConfirmed,
          depositConfirmedAt: metadata.depositConfirmedAt,
          ndaAccepted: metadata.ndaAccepted,
          ndaAcceptedAt: metadata.ndaAcceptedAt,
        },
      },
      listing: {
        id: listing?.id?.uuid,
        title: listing?.attributes?.title,
        description: listing?.attributes?.description,
        publicData: listingPublicData,
        // Confidential details - only accessible in workspace
        confidentialDetails: {
          projectBrief:
            listingPrivateData.projectBrief || listingPublicData.confidentialBrief || null,
          deliverables:
            listingPrivateData.deliverables || listingPublicData.confidentialDeliverables || null,
          contactName: listingPrivateData.contactName || null,
          contactEmail: listingPrivateData.contactEmail || null,
          contactPhone: listingPrivateData.contactPhone || null,
          internalNotes: listingPrivateData.internalNotes || null,
          attachments: listingPrivateData.attachments || [],
        },
      },
      provider: {
        id: provider?.id?.uuid,
        displayName: provider?.attributes?.profile?.displayName,
        companyName: provider?.attributes?.profile?.publicData?.companyName,
        // Confidential contact info for accepted students
        email: provider?.attributes?.email,
      },
      customer: {
        id: customer?.id?.uuid,
        displayName: customer?.attributes?.profile?.displayName,
        email: customer?.attributes?.email,
      },
      messages: projectMessages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderType: msg.senderType,
        content: msg.content,
        attachments: msg.attachments || [],
        createdAt: msg.createdAt,
        readAt: msg.readAt,
      })),
      ndaRequired: listingPrivateData.ndaRequired || listingPublicData.ndaRequired || false,
      ndaAccepted: metadata.ndaAccepted || false,
    };

    res.status(200).json(workspaceData);
  } catch (error) {
    console.error('Project workspace error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/project-workspace/:transactionId/messages
 *
 * Send a secure message within the project workspace.
 */
async function sendProjectMessage(req, res) {
  const { transactionId } = req.params;
  const { content, attachments } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  // Security: Validate message content length to prevent abuse
  const MAX_MESSAGE_LENGTH = 5000;
  if (content.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  // Security: Validate UUID format for transaction ID
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(transactionId)) {
    return res.status(400).json({ error: 'Invalid transaction ID format.' });
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
    });

    const transaction = txResponse.data.data;
    const customerId = transaction.relationships?.customer?.data?.id?.uuid;
    const providerId = transaction.relationships?.provider?.data?.id?.uuid;

    // Check authorization
    const isCustomer = customerId === currentUser.id.uuid;
    const isProvider = providerId === currentUser.id.uuid;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: 'You are not authorized to send messages.' });
    }

    // For students, verify access (accepted + work hold cleared)
    if (isCustomer) {
      const metadata = transaction.attributes.metadata || {};
      const lastTransition = transaction.attributes.lastTransition;
      const isAccepted = lastTransition?.includes('accept') || lastTransition?.includes('complete');
      const workHoldCleared = metadata.workHoldCleared === true;

      if (!isAccepted || !workHoldCleared) {
        return res.status(403).json({
          error: 'You cannot send messages until you are accepted and the deposit hold is cleared.',
        });
      }
    }

    const currentMetadata = transaction.attributes.metadata || {};
    const existingMessages = currentMetadata.projectMessages || [];

    // Create new message with cryptographically secure ID
    const newMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      senderId: currentUser.id.uuid,
      senderName: currentUser.attributes.profile.displayName,
      senderType: isProvider ? 'provider' : 'customer',
      content: content.trim(),
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    // Update transaction metadata with new message
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        projectMessages: [...existingMessages, newMessage],
        lastMessageAt: newMessage.createdAt,
      },
    });

    res.status(200).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Send project message error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/project-workspace/:transactionId/accept-nda
 *
 * Accept the NDA for a project (required before accessing confidential details).
 */
async function acceptNda(req, res) {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdk();

    // Get the transaction
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
    });

    const transaction = txResponse.data.data;
    const customerId = transaction.relationships?.customer?.data?.id?.uuid;

    // Only the customer (student) needs to accept NDA
    if (customerId !== currentUser.id.uuid) {
      return res.status(403).json({ error: 'Only the student can accept the NDA.' });
    }

    const currentMetadata = transaction.attributes.metadata || {};

    // Update transaction metadata
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        ndaAccepted: true,
        ndaAcceptedAt: new Date().toISOString(),
        ndaAcceptedBy: currentUser.id.uuid,
      },
    });

    res.status(200).json({
      success: true,
      message: 'NDA accepted successfully.',
      ndaAcceptedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Accept NDA error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/project-workspace/:transactionId/mark-read
 *
 * Mark messages as read.
 */
async function markMessagesRead(req, res) {
  const { transactionId } = req.params;
  const { messageIds } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required.' });
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdk();

    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
    });

    const transaction = txResponse.data.data;
    const currentMetadata = transaction.attributes.metadata || {};
    const messages = currentMetadata.projectMessages || [];

    // Mark specified messages as read
    const updatedMessages = messages.map(msg => {
      if (messageIds?.includes(msg.id) && msg.senderId !== currentUser.id.uuid && !msg.readAt) {
        return { ...msg, readAt: new Date().toISOString() };
      }
      return msg;
    });

    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        projectMessages: updatedMessages,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark messages read error:', error);
    handleError(res, error);
  }
}

function getAccessDeniedMessage(reason) {
  switch (reason) {
    case 'not_accepted':
      return 'You have not been accepted for this project yet. Please wait for the corporate partner to review your application.';
    case 'deposit_pending':
      return "The corporate partner's deposit is pending confirmation. You will gain access to the project workspace once the deposit is confirmed by Street2Ivy.";
    case 'unauthorized':
      return 'You are not authorized to access this project workspace.';
    default:
      return 'Access to this project workspace is currently restricted.';
  }
}

module.exports = {
  get: getProjectWorkspace,
  sendMessage: sendProjectMessage,
  acceptNda,
  markRead: markMessagesRead,
};
