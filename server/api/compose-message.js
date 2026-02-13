/**
 * Compose Message & Direct Message API Routes
 *
 * Handles user-initiated messaging:
 *   - Students can message: admins (always), corporate partners (after being invited)
 *   - Corporate partners can message: admins (always), students (after accepting their application)
 *
 * Also handles direct-message threads (user ↔ admin) stored in the direct_messages table.
 *
 * Routes:
 *   GET  /api/compose/eligible-recipients     — List users the current user can message
 *   POST /api/compose/message                 — Initiate a new conversation
 *   GET  /api/direct-messages/inbox           — Thread previews for current user
 *   GET  /api/direct-messages/:threadId       — Messages in a thread
 *   POST /api/direct-messages/:threadId       — Send reply in a thread
 *   POST /api/direct-messages/:threadId/read  — Mark thread as read
 */

const crypto = require('crypto');
const db = require('../api-util/db');
const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { sendNotification, NOTIFICATION_TYPES } = require('../api-util/notifications');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the current authenticated user and their type.
 * Returns { userId, currentUser, userType } or sends an error response.
 */
async function getCurrentUser(req, res) {
  const sdk = getSdk(req, res);
  const response = await sdk.currentUser.show();
  const currentUser = response.data.data;
  const userId = currentUser.id.uuid;
  const userType = currentUser.attributes?.profile?.publicData?.userType || '';
  return { userId, currentUser, userType };
}

/**
 * Fetch admin users (educational-admin + system-admin) via Integration SDK.
 * Returns an array of { id, name, userType, email }.
 */
async function fetchAdminUsers(req) {
  const integrationSdk = getIntegrationSdkForTenant(req.tenant);
  const adminRecipients = [];

  // Fetch educational admins
  try {
    const eduRes = await integrationSdk.users.query({
      pub_userType: 'educational-admin',
      'fields.user': ['profile.displayName', 'profile.publicData', 'email'],
    });
    const eduUsers = eduRes.data.data || [];
    eduUsers.forEach(u => {
      adminRecipients.push({
        id: u.id.uuid,
        name: u.attributes?.profile?.displayName || 'Educational Admin',
        userType: 'educational-admin',
        email: u.attributes?.email || null,
      });
    });
  } catch (e) {
    console.warn('[ComposeMessage] Error fetching educational admins:', e.message);
  }

  // Fetch system admins
  try {
    const sysRes = await integrationSdk.users.query({
      pub_userType: 'system-admin',
      'fields.user': ['profile.displayName', 'profile.publicData', 'email'],
    });
    const sysUsers = sysRes.data.data || [];
    sysUsers.forEach(u => {
      adminRecipients.push({
        id: u.id.uuid,
        name: u.attributes?.profile?.displayName || 'System Admin',
        userType: 'system-admin',
        email: u.attributes?.email || null,
      });
    });
  } catch (e) {
    console.warn('[ComposeMessage] Error fetching system admins:', e.message);
  }

  return adminRecipients;
}

// ─── GET /api/compose/eligible-recipients ────────────────────────────────────

const getEligibleRecipients = async (req, res) => {
  try {
    const { userId, userType } = await getCurrentUser(req, res);

    // Fetch admin users (available to everyone)
    const adminUsers = await fetchAdminUsers(req);
    // Exclude self from admin list
    const adminRecipients = adminUsers
      .filter(a => a.id !== userId)
      .map(a => ({
        id: a.id,
        name: a.name,
        userType: a.userType,
        reason: 'admin',
        email: a.email,
      }));

    let otherRecipients = [];

    if (userType === 'student') {
      // Students can message corporate partners who have invited them
      const invites = db.corporateInvites.getByStudentId(userId);
      // Deduplicate by corporate partner ID (may have multiple invites from same partner)
      const partnerMap = new Map();
      invites.forEach(invite => {
        if (invite.corporatePartnerId && !partnerMap.has(invite.corporatePartnerId)) {
          partnerMap.set(invite.corporatePartnerId, {
            id: invite.corporatePartnerId,
            name: null, // Will be resolved below
            userType: 'corporate-partner',
            reason: 'invited',
            projectTitle: invite.projectTitle || null,
          });
        }
      });

      // Resolve corporate partner names via Integration SDK
      if (partnerMap.size > 0) {
        const integrationSdk = getIntegrationSdkForTenant(req.tenant);
        for (const [partnerId, entry] of partnerMap) {
          try {
            const sharetribeSdk = require('sharetribe-flex-sdk');
            const userRes = await integrationSdk.users.show({
              id: new sharetribeSdk.types.UUID(partnerId),
            });
            entry.name = userRes.data.data.attributes?.profile?.displayName || 'Corporate Partner';
            entry.email = userRes.data.data.attributes?.email || null;
          } catch (e) {
            entry.name = 'Corporate Partner';
          }
        }
        otherRecipients = Array.from(partnerMap.values());
      }
    } else if (userType === 'corporate-partner') {
      // Corporate partners can message students with accepted applications
      const acceptedApps = db.projectApplications.getByCorporateId(userId, { status: 'accepted' });
      // Deduplicate by student ID
      const studentMap = new Map();
      acceptedApps.forEach(app => {
        if (app.studentId && !studentMap.has(app.studentId)) {
          studentMap.set(app.studentId, {
            id: app.studentId,
            name: app.studentName || 'Student',
            userType: 'student',
            reason: 'accepted',
            projectTitle: app.listingTitle || null,
            email: app.studentEmail || null,
          });
        }
      });
      otherRecipients = Array.from(studentMap.values());
    }

    res.status(200).json({
      recipients: [...adminRecipients, ...otherRecipients],
    });
  } catch (e) {
    console.error('[ComposeMessage] Error fetching eligible recipients:', e);
    handleError(res, e);
  }
};

// ─── POST /api/compose/message ───────────────────────────────────────────────

const sendComposeMessage = async (req, res) => {
  try {
    const { userId, currentUser, userType } = await getCurrentUser(req, res);
    const { recipientId, subject, content } = req.body;

    // Validate
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient is required.' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required.' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Message must be 5000 characters or fewer.' });
    }
    if (recipientId === userId) {
      return res.status(400).json({ error: 'You cannot message yourself.' });
    }

    // Fetch recipient info via Integration SDK
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    const sharetribeSdk = require('sharetribe-flex-sdk');
    let recipient;
    try {
      const recipientRes = await integrationSdk.users.show({
        id: new sharetribeSdk.types.UUID(recipientId),
      });
      recipient = recipientRes.data.data;
    } catch (e) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const recipientType = recipient.attributes?.profile?.publicData?.userType || '';
    const recipientName = recipient.attributes?.profile?.displayName || 'User';
    const recipientEmail = recipient.attributes?.email || null;
    const senderName = currentUser.attributes?.profile?.displayName || 'User';

    // Validate eligibility
    const isAdmin = ['educational-admin', 'system-admin'].includes(recipientType);

    if (!isAdmin) {
      // Non-admin recipient — check eligibility rules
      if (userType === 'student' && recipientType === 'corporate-partner') {
        // Student → Corporate Partner: must have been invited
        const invites = db.corporateInvites.getByStudentId(userId);
        const hasInvite = invites.some(inv => inv.corporatePartnerId === recipientId);
        if (!hasInvite) {
          return res.status(403).json({
            error: 'You can only message corporate partners who have invited you to apply.',
          });
        }
      } else if (userType === 'corporate-partner' && recipientType === 'student') {
        // Corporate Partner → Student: must have accepted application
        const acceptedApps = db.projectApplications.getByCorporateId(userId, { status: 'accepted' });
        const hasAccepted = acceptedApps.some(app => app.studentId === recipientId);
        if (!hasAccepted) {
          return res.status(403).json({
            error: 'You can only message students whose applications you have accepted.',
          });
        }
      } else {
        return res.status(403).json({ error: 'You are not eligible to message this user.' });
      }
    }

    const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
    let conversationId;
    let conversationType;

    if (isAdmin) {
      // Route to direct_messages table
      const threadId = db.directMessages.getOrCreateThreadId(userId, recipientId);
      const messageId = `dm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      db.directMessages.create({
        id: messageId,
        threadId,
        senderId: userId,
        senderName,
        senderType: userType,
        recipientId,
        recipientName,
        recipientType,
        subject: subject || null,
        content: content.trim(),
      });

      conversationId = threadId;
      conversationType = 'direct';

      // Send email notification (non-blocking)
      try {
        await sendNotification({
          type: NOTIFICATION_TYPES.DIRECT_MESSAGE,
          recipientId,
          recipientEmail,
          data: {
            recipientName,
            senderName,
            messagePreview: content.trim().substring(0, 100),
            conversationUrl: `${baseUrl}/inbox/direct/${threadId}`,
            subject: subject || null,
          },
        });
      } catch (notifErr) {
        console.error('[ComposeMessage] Notification error:', notifErr.message);
      }
    } else {
      // Route to application_messages pipeline
      // Try to find an existing active conversation
      const studentId = userType === 'student' ? userId : recipientId;
      const corporateId = userType === 'corporate-partner' ? userId : recipientId;
      let application = db.projectApplications.findActiveConversation(studentId, corporateId);

      if (!application) {
        // Create a lightweight application record to anchor the conversation
        const appId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const studentName_ = userType === 'student' ? senderName : recipientName;
        const studentEmail_ = userType === 'student'
          ? (currentUser.attributes?.email || null)
          : recipientEmail;
        const corporateName_ = userType === 'corporate-partner' ? senderName : recipientName;
        const corporateEmail_ = userType === 'corporate-partner'
          ? (currentUser.attributes?.email || null)
          : recipientEmail;

        db.projectApplications.create({
          id: appId,
          studentId,
          listingId: 'direct',
          status: 'active',
          listingTitle: subject || 'Direct Message',
          corporateId,
          corporateName: corporateName_,
          corporateEmail: corporateEmail_,
          studentName: studentName_,
          studentEmail: studentEmail_,
          initiatedBy: userType === 'student' ? 'student' : 'corporate-partner',
        });
        application = db.projectApplications.getById(appId);
      }

      // Create the message
      const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      db.applicationMessages.create({
        id: messageId,
        applicationId: application.id,
        senderId: userId,
        senderName,
        senderRole: userType,
        content: content.trim(),
        messageType: 'user',
      });

      conversationId = application.id;
      conversationType = 'application';

      // Send email notification (non-blocking)
      try {
        const { notifyNewApplicationMessage } = require('../api-util/notifications');
        const isStudent = userType === 'student';
        await notifyNewApplicationMessage({
          application,
          message: { content: content.trim() },
          senderName,
          recipientId,
          recipientEmail,
          recipientName,
        });
      } catch (notifErr) {
        console.error('[ComposeMessage] Notification error:', notifErr.message);
      }
    }

    res.status(201).json({
      conversationId,
      conversationType,
    });
  } catch (e) {
    console.error('[ComposeMessage] Error sending message:', e);
    handleError(res, e);
  }
};

// ─── GET /api/direct-messages/inbox ──────────────────────────────────────────

const getDirectMessageInbox = async (req, res) => {
  try {
    const { userId } = await getCurrentUser(req, res);

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = parseInt(req.query.offset, 10) || 0;

    const threads = db.directMessages.getThreadPreviews(userId, { limit, offset });

    res.status(200).json({
      threads,
      pagination: { limit, offset, count: threads.length },
    });
  } catch (e) {
    console.error('[DirectMessages] Error fetching inbox:', e);
    handleError(res, e);
  }
};

// ─── GET /api/direct-messages/:threadId ──────────────────────────────────────

const getDirectMessages = async (req, res) => {
  try {
    const { userId } = await getCurrentUser(req, res);
    const { threadId } = req.params;

    // Verify the user is a participant in this thread
    if (!threadId.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const messages = db.directMessages.getByThreadId(threadId, { limit, offset });

    // Auto-mark as read when the thread is opened
    db.directMessages.markAsRead(threadId, userId);

    // Determine the other party info
    const otherUserId = threadId
      .replace('dm_', '')
      .split('_')
      .find(id => id !== userId);

    res.status(200).json({
      threadId,
      otherUserId,
      messages,
      pagination: { limit, offset, count: messages.length },
    });
  } catch (e) {
    console.error('[DirectMessages] Error fetching messages:', e);
    handleError(res, e);
  }
};

// ─── POST /api/direct-messages/:threadId ─────────────────────────────────────

const sendDirectMessage = async (req, res) => {
  try {
    const { userId, currentUser, userType } = await getCurrentUser(req, res);
    const { threadId } = req.params;
    const { content } = req.body;

    // Verify the user is a participant in this thread
    if (!threadId.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required.' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Message must be 5000 characters or fewer.' });
    }

    // Determine the other party from the thread ID
    const otherUserId = threadId
      .replace('dm_', '')
      .split('_')
      .find(id => id !== userId);

    if (!otherUserId) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    // Fetch other user's info
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    const sharetribeSdk = require('sharetribe-flex-sdk');
    let recipientName = 'User';
    let recipientType = '';
    let recipientEmail = null;

    try {
      const otherRes = await integrationSdk.users.show({
        id: new sharetribeSdk.types.UUID(otherUserId),
      });
      const otherUser = otherRes.data.data;
      recipientName = otherUser.attributes?.profile?.displayName || 'User';
      recipientType = otherUser.attributes?.profile?.publicData?.userType || '';
      recipientEmail = otherUser.attributes?.email || null;
    } catch (e) {
      console.warn('[DirectMessages] Could not fetch recipient info:', e.message);
    }

    const senderName = currentUser.attributes?.profile?.displayName || 'User';
    const messageId = `dm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const message = db.directMessages.create({
      id: messageId,
      threadId,
      senderId: userId,
      senderName,
      senderType: userType,
      recipientId: otherUserId,
      recipientName,
      recipientType,
      content: content.trim(),
    });

    // Send response immediately
    res.status(201).json({ message });

    // Send email notification (non-blocking)
    const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
    try {
      await sendNotification({
        type: NOTIFICATION_TYPES.DIRECT_MESSAGE,
        recipientId: otherUserId,
        recipientEmail,
        data: {
          recipientName,
          senderName,
          messagePreview: content.trim().substring(0, 100),
          conversationUrl: `${baseUrl}/inbox/direct/${threadId}`,
        },
      });
    } catch (notifErr) {
      console.error('[DirectMessages] Notification error:', notifErr.message);
    }
  } catch (e) {
    console.error('[DirectMessages] Error sending message:', e);
    handleError(res, e);
  }
};

// ─── POST /api/direct-messages/:threadId/read ────────────────────────────────

const markDirectMessageRead = async (req, res) => {
  try {
    const { userId } = await getCurrentUser(req, res);
    const { threadId } = req.params;

    // Verify the user is a participant in this thread
    if (!threadId.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }

    const markedCount = db.directMessages.markAsRead(threadId, userId);

    res.status(200).json({ success: true, markedCount });
  } catch (e) {
    console.error('[DirectMessages] Error marking messages as read:', e);
    handleError(res, e);
  }
};

module.exports = {
  getEligibleRecipients,
  sendMessage: sendComposeMessage,
  getDirectMessageInbox,
  getDirectMessages,
  sendDirectMessage,
  markDirectMessageRead,
};
