/**
 * Application Messaging API Routes
 *
 * Handles free-form messaging between students and corporate partners
 * within application conversations. Uses the custom SQLite-backed
 * applicationMessages DAO (not Sharetribe transactions).
 *
 * Routes:
 *   GET  /api/messages/inbox           — Conversation previews for the current user
 *   GET  /api/messages/unread-count    — Total unread messages for the current user
 *   GET  /api/messages/:applicationId  — All messages in a conversation
 *   POST /api/messages/:applicationId  — Send a new message
 *   POST /api/messages/:applicationId/read — Mark all messages as read
 */

const crypto = require('crypto');
const db = require('../api-util/db');
const { getSdk, handleError } = require('../api-util/sdk');
const { notifyNewApplicationMessage } = require('../api-util/notifications');

/**
 * Verify the current user is a participant in the given application.
 * Returns { application, userId, userRole } or sends 403/404 and returns null.
 */
async function requireParticipant(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const userId = currentUser.id.uuid;

  const { applicationId } = req.params;
  const application = db.projectApplications.getById(applicationId);

  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
    return null;
  }

  const isStudent = application.studentId === userId;
  const isCorporate = application.corporateId === userId;

  // If no corporateId stored yet, check listing ownership via Sharetribe
  if (!isStudent && !isCorporate && application.listingId) {
    try {
      const sharetribeSdk = require('sharetribe-flex-sdk');
      const { UUID } = sharetribeSdk.types;
      await sdk.ownListings.show({ id: new UUID(application.listingId) });
      // User owns the listing — they are the corporate partner.
      // Backfill corporateId so future checks are fast.
      const userName = currentUser.attributes?.profile?.displayName || '';
      const userEmail = currentUser.attributes?.email || '';
      db.projectApplications.update(application.id, {
        corporateId: userId,
        corporateName: userName,
        corporateEmail: userEmail,
      });
      return {
        application: { ...application, corporateId: userId, corporateName: userName, corporateEmail: userEmail },
        userId,
        currentUser,
        userRole: 'corporate-partner',
      };
    } catch (_) {
      // Not the listing owner either
    }
  }

  if (!isStudent && !isCorporate) {
    res.status(403).json({ error: 'You are not a participant in this conversation.' });
    return null;
  }

  return {
    application,
    userId,
    currentUser,
    userRole: isStudent ? 'student' : 'corporate-partner',
  };
}

// ─── GET /api/messages/inbox ─────────────────────────────────────────────────

/**
 * Returns conversation previews (application + last message + unread count)
 * for the inbox list view.
 *
 * Query params:
 *   limit  — max items (default 20, max 50)
 *   offset — pagination offset (default 0)
 */
const getInbox = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const userId = currentUserResponse.data.data.id.uuid;

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = parseInt(req.query.offset, 10) || 0;

    const conversations = db.applicationMessages.getConversationPreviews(userId, { limit, offset });

    res.status(200).json({
      conversations,
      pagination: { limit, offset, count: conversations.length },
    });
  } catch (e) {
    console.error('[Messaging] Error fetching inbox:', e);
    handleError(res, e);
  }
};

// ─── GET /api/messages/unread-count ──────────────────────────────────────────

const getUnreadCount = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const userId = currentUserResponse.data.data.id.uuid;

    const count = db.applicationMessages.getUnreadCountByUser(userId);

    res.status(200).json({ unreadCount: count });
  } catch (e) {
    console.error('[Messaging] Error fetching unread count:', e);
    handleError(res, e);
  }
};

// ─── GET /api/messages/:applicationId ────────────────────────────────────────

/**
 * Returns all messages in a conversation.
 *
 * Query params:
 *   limit  — max messages (default 50, max 100)
 *   offset — pagination offset (default 0)
 */
const getMessages = async (req, res) => {
  try {
    const ctx = await requireParticipant(req, res);
    if (!ctx) return;

    const { application, userId } = ctx;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const messages = db.applicationMessages.getByApplicationId(application.id, { limit, offset });
    const totalMessages = db.applicationMessages.getMessageCount(application.id);

    // Auto-mark as read when the conversation is opened
    db.applicationMessages.markAsRead(application.id, userId);

    res.status(200).json({
      application: {
        id: application.id,
        status: application.status,
        studentId: application.studentId,
        studentName: application.studentName,
        corporateId: application.corporateId,
        corporateName: application.corporateName,
        listingTitle: application.listingTitle,
        listingId: application.listingId,
        initiatedBy: application.initiatedBy,
        submittedAt: application.submittedAt,
      },
      messages,
      pagination: { limit, offset, total: totalMessages, count: messages.length },
    });
  } catch (e) {
    console.error('[Messaging] Error fetching messages:', e);
    handleError(res, e);
  }
};

// ─── POST /api/messages/:applicationId ───────────────────────────────────────

/**
 * Send a new message in an application conversation.
 *
 * Body (JSON):
 *   content — message text (required, 1–5000 characters)
 */
const sendMessage = async (req, res) => {
  try {
    const ctx = await requireParticipant(req, res);
    if (!ctx) return;

    const { application, userId, currentUser, userRole } = ctx;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Message must be 5000 characters or fewer.' });
    }

    // Don't allow messaging on withdrawn/cancelled applications
    if (['withdrawn', 'cancelled'].includes(application.status)) {
      return res.status(400).json({ error: 'This conversation is closed.' });
    }

    const senderName = currentUser.attributes?.profile?.displayName || 'User';
    const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const message = db.applicationMessages.create({
      id: messageId,
      applicationId: application.id,
      senderId: userId,
      senderName,
      senderRole: userRole,
      content: content.trim(),
      messageType: 'user',
    });

    // Send response immediately
    res.status(201).json({ message });

    // Send notification asynchronously (non-blocking)
    try {
      const isStudent = application.studentId === userId;
      const recipientId = isStudent ? application.corporateId : application.studentId;
      const recipientEmail = isStudent ? application.corporateEmail : application.studentEmail;
      const recipientName = isStudent ? application.corporateName : application.studentName;

      if (recipientId) {
        await notifyNewApplicationMessage({
          application,
          message,
          senderName,
          recipientId,
          recipientEmail,
          recipientName,
        });
      }
    } catch (notifErr) {
      console.error('[Messaging] Notification error:', notifErr.message);
    }
  } catch (e) {
    console.error('[Messaging] Error sending message:', e);
    handleError(res, e);
  }
};

// ─── POST /api/messages/:applicationId/read ──────────────────────────────────

/**
 * Mark all messages from the other party as read.
 */
const markRead = async (req, res) => {
  try {
    const ctx = await requireParticipant(req, res);
    if (!ctx) return;

    const { application, userId } = ctx;
    const markedCount = db.applicationMessages.markAsRead(application.id, userId);

    res.status(200).json({ success: true, markedCount });
  } catch (e) {
    console.error('[Messaging] Error marking messages as read:', e);
    handleError(res, e);
  }
};

module.exports = {
  getInbox,
  getUnreadCount,
  getMessages,
  sendMessage,
  markRead,
};
