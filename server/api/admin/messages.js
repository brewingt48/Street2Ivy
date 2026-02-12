/**
 * Admin Messages API
 *
 * Allows system admins to send messages to educational admins, students,
 * and corporate partners. Recipients can view and mark messages as read.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../../api-util/db');
const { getIntegrationSdkForTenant } = require('../../api-util/integrationSdk');
const { getSdk, handleError } = require('../../api-util/sdk');

// Message ID counter - seeded from existing DB records
let messageIdCounter = (() => {
  const all = db.adminMessages.getAll();
  if (all.length === 0) return 1;
  // Extract max numeric suffix from existing IDs like "admin-msg-42"
  let max = 0;
  all.forEach(m => {
    const match = m.id.match(/admin-msg-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  });
  return max + 1;
})();

/**
 * Verify the current user is a system admin
 */
async function verifySystemAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'system-admin') {
    return null;
  }

  return currentUser;
}

/**
 * POST /api/admin/messages
 *
 * Send a message from system admin to an educational admin, student, or corporate partner.
 * Used for communicating about platform matters, policy updates, or account-related issues.
 *
 * Body:
 *   recipientId  - User ID of the recipient (educational admin, student, or corporate partner)
 *   subject      - Message subject
 *   content      - Message content
 *   studentId    - (optional) Related student ID (for messages to educational admins about a student)
 *   severity     - (optional) Message severity: info, warning, urgent
 */
async function sendMessage(req, res) {
  const { recipientId, subject, content, studentId, severity = 'info' } = req.body;

  if (!recipientId) {
    return res.status(400).json({ error: 'Recipient ID is required.' });
  }

  if (!subject || !content) {
    return res.status(400).json({ error: 'Subject and content are required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Get recipient info
    const recipientResponse = await integrationSdk.users.show({
      id: recipientId,
    });

    const recipient = recipientResponse.data.data;
    const recipientPublicData = recipient.attributes.profile.publicData || {};
    const recipientType = recipientPublicData.userType;

    // System admin can message educational admins, students, and corporate partners
    const allowedRecipientTypes = ['educational-admin', 'student', 'corporate-partner'];
    if (!allowedRecipientTypes.includes(recipientType)) {
      return res.status(400).json({
        error: 'Messages can only be sent to educational administrators, students, or corporate partners.',
      });
    }

    // Get student info if studentId is provided (for messages to educational admins about a student)
    let studentInfo = null;
    if (studentId) {
      try {
        const studentResponse = await integrationSdk.users.show({
          id: studentId,
        });
        const student = studentResponse.data.data;
        studentInfo = {
          id: studentId,
          displayName: student.attributes.profile.displayName,
          university: student.attributes.profile.publicData?.university,
        };
      } catch (e) {
        // Student not found, continue without student info
      }
    }

    // Create the message
    const message = {
      id: `admin-msg-${messageIdCounter++}`,
      senderId: admin.id.uuid,
      senderName: admin.attributes.profile.displayName,
      recipientId,
      recipientType,
      recipientName: recipient.attributes.profile.displayName,
      recipientInstitution: recipientPublicData.institutionName || null,
      recipientUniversity: recipientPublicData.university || null,
      subject,
      content,
      student: studentInfo,
      severity,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Store the message in SQLite
    db.adminMessages.create(message);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: message,
    });
  } catch (error) {
    console.error('Admin send message error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/messages
 *
 * List messages. System admins see all messages they've sent.
 * Educational admins and students see messages addressed to them.
 *
 * Query params:
 *   page     - Pagination page (default: 1)
 *   perPage  - Results per page (default: 20)
 */
async function listMessages(req, res) {
  const { page = '1', perPage = '20' } = req.query;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    let filteredMessages = [];

    if (userType === 'system-admin') {
      // System admins see all messages they've sent
      filteredMessages = db.adminMessages.getBySenderId(currentUser.id.uuid);
    } else if (
      userType === 'educational-admin' ||
      userType === 'student' ||
      userType === 'corporate-partner'
    ) {
      // Educational admins, students, and corporate partners see messages addressed to them
      filteredMessages = db.adminMessages.getByRecipientId(currentUser.id.uuid);
    } else {
      return res.status(403).json({
        error: 'Access denied.',
      });
    }

    // Sort by date (newest first) - already sorted by DB, but ensure
    filteredMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const endIndex = startIndex + perPageNum;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    res.status(200).json({
      messages: paginatedMessages,
      pagination: {
        totalItems: filteredMessages.length,
        totalPages: Math.ceil(filteredMessages.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
    });
  } catch (error) {
    console.error('Admin list messages error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/admin/messages/:messageId/read
 *
 * Mark a message as read.
 */
async function markAsRead(req, res) {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required.' });
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    // Find the message
    const message = db.adminMessages.getById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    // Verify the user is the recipient
    if (message.recipientId !== currentUser.id.uuid) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Mark as read
    db.adminMessages.markRead(messageId);

    res.status(200).json({
      success: true,
      message: 'Message marked as read.',
    });
  } catch (error) {
    console.error('Admin mark message read error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/admin/messages/unread-count
 *
 * Get count of unread messages for the current user.
 */
async function getUnreadCount(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    // Educational admins, students, and corporate partners can have unread messages
    if (
      publicData.userType !== 'educational-admin' &&
      publicData.userType !== 'student' &&
      publicData.userType !== 'corporate-partner'
    ) {
      return res.status(200).json({ unreadCount: 0 });
    }

    const unreadCount = db.adminMessages.getUnreadCountByRecipient(currentUser.id.uuid);

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Admin unread count error:', error);
    handleError(res, error);
  }
}

module.exports = {
  send: sendMessage,
  list: listMessages,
  markAsRead,
  getUnreadCount,
};
