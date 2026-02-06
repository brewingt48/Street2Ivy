/**
 * Educational Admin Messaging API
 *
 * Allows educational administrators to send messages to:
 * - All students from their institution
 * - Individual students from their institution
 * - System administrators (Street2Ivy support)
 *
 * And receive messages from:
 * - System administrators
 * - Students
 */

const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');

// In-memory message storage (in production, use a database)
let educationMessages = [];

/**
 * Verify the current user is an educational admin and get their info
 */
async function verifyEducationalAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'educational-admin') {
    return null;
  }

  return {
    user: currentUser,
    institutionName: publicData.institutionName,
    institutionDomain: publicData.institutionDomain || publicData.emailDomain,
  };
}

/**
 * POST /api/education/messages
 *
 * Send a message from an educational admin
 */
async function sendMessage(req, res) {
  const { recipientType, recipientId, subject, content } = req.body;

  if (!subject || !content) {
    return res.status(400).json({
      error: 'Subject and content are required.',
    });
  }

  if (!recipientType) {
    return res.status(400).json({
      error: 'Recipient type is required.',
    });
  }

  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    const { user: admin, institutionName, institutionDomain } = adminInfo;
    const senderId = admin.id.uuid;
    const senderName = admin.attributes.profile.displayName;

    // Determine recipient details
    let recipientName = '';
    let actualRecipientId = null;

    if (recipientType === 'all-students') {
      recipientName = `All Students (${institutionName})`;
    } else if (recipientType === 'system-admin') {
      recipientName = 'Street2Ivy Support';
    } else if (recipientType.startsWith('student-')) {
      actualRecipientId = recipientType.replace('student-', '');
      // Fetch student name
      try {
        const integrationSdk = getIntegrationSdk();
        const studentResponse = await integrationSdk.users.show({ id: actualRecipientId });
        recipientName = studentResponse.data.data.attributes.profile.displayName;
      } catch {
        recipientName = 'Student';
      }
    }

    // Create message record
    const message = {
      id: `edumsg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      senderType: 'educational-admin',
      senderInstitution: institutionName,
      recipientType: recipientType.startsWith('student-') ? 'student' : recipientType,
      recipientId: actualRecipientId,
      recipientName,
      subject,
      content,
      sentAt: new Date().toISOString(),
      read: false,
    };

    educationMessages.push(message);

    console.log('Educational admin message sent:', {
      id: message.id,
      from: senderName,
      to: recipientName,
      subject: subject,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      messageId: message.id,
    });
  } catch (error) {
    console.error('Education message send error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/education/messages
 *
 * Get both sent and received messages for the current educational admin
 */
async function listMessages(req, res) {
  try {
    const adminInfo = await verifyEducationalAdmin(req, res);
    if (!adminInfo) {
      return res.status(403).json({
        error: 'Access denied. Educational administrator privileges required.',
      });
    }

    const userId = adminInfo.user.id.uuid;

    // Get messages sent by this admin
    const sentMessages = educationMessages
      .filter(msg => msg.senderId === userId)
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // Get messages received by this admin (from system admin or students)
    // In a real system, these would be stored with recipientId === userId
    // For demo purposes, we'll create some sample received messages
    const receivedMessages = educationMessages
      .filter(msg =>
        msg.recipientId === userId ||
        (msg.recipientType === 'educational-admin' && msg.senderId !== userId)
      )
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // Also include any messages sent TO educational admins (from system admin messages)
    // This would come from the admin messages system
    const adminMessagesForEduAdmin = getMessagesForEducationalAdmin(userId, adminInfo.institutionDomain);

    res.status(200).json({
      sentMessages,
      receivedMessages: [...receivedMessages, ...adminMessagesForEduAdmin].sort(
        (a, b) => new Date(b.sentAt || b.receivedAt) - new Date(a.sentAt || a.receivedAt)
      ),
    });
  } catch (error) {
    console.error('Education messages list error:', error);
    handleError(res, error);
  }
}

/**
 * Helper to get messages sent to educational admins from system admin
 * This integrates with the admin messaging system
 */
function getMessagesForEducationalAdmin(userId, institutionDomain) {
  // Import admin messages if available
  try {
    const adminMessages = require('./admin/messages');
    // Get messages from the admin system that were sent to this edu admin
    // This is a simplified version - in production, you'd query the actual message store
    return [];
  } catch {
    return [];
  }
}

/**
 * Helper function to add a received message (called from other APIs)
 */
function addReceivedMessage(toUserId, fromUserId, fromName, fromType, subject, content) {
  const message = {
    id: `edumsg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    senderId: fromUserId,
    senderName: fromName,
    senderType: fromType,
    recipientId: toUserId,
    recipientType: 'educational-admin',
    recipientName: null,
    subject,
    content,
    sentAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    read: false,
  };
  educationMessages.push(message);
  return message;
}

module.exports = {
  send: sendMessage,
  list: listMessages,
  addReceivedMessage,
};
