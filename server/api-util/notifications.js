/**
 * Email Notification Service for ProveGround
 *
 * This module handles sending email notifications for key platform events:
 * - Transaction state changes (application received, accepted, declined, completed)
 * - Project invitations
 * - Messages from corporate partners
 * - Assessment completions
 *
 * Uses Sharetribe's built-in email system through the Integration API.
 */

const { getIntegrationSdk } = require('./sdk');

// Email notification types
const NOTIFICATION_TYPES = {
  // Student notifications
  APPLICATION_RECEIVED: 'application-received',
  APPLICATION_ACCEPTED: 'application-accepted',
  APPLICATION_DECLINED: 'application-declined',
  PROJECT_COMPLETED: 'project-completed',
  INVITE_RECEIVED: 'invite-received',
  NEW_MESSAGE: 'new-message',
  ASSESSMENT_RECEIVED: 'assessment-received',

  // Corporate partner notifications
  NEW_APPLICATION: 'new-application',
  STUDENT_ACCEPTED_INVITE: 'student-accepted-invite',
  DELIVERABLE_SUBMITTED: 'deliverable-submitted',

  // Educational admin notifications
  STUDENT_PROJECT_UPDATE: 'student-project-update',
  ADMIN_MESSAGE: 'admin-message',
};

// Notification templates with subject lines and content generators
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.APPLICATION_RECEIVED]: {
    subject: 'Application Received - {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      Your application for "{projectTitle}" has been received!

      The corporate partner will review your application and get back to you soon.

      Project Details:
      - Company: {companyName}
      - Timeline: {timeline}

      You can track your application status in your dashboard.

      Best of luck!
      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.APPLICATION_ACCEPTED]: {
    subject: '🎉 Congratulations! Your Application Was Accepted',
    getContent: (data) => `
      Hi {studentName},

      Great news! Your application for "{projectTitle}" has been accepted!

      Next Steps:
      1. Sign the NDA/Terms agreement
      2. Access the Project Workspace
      3. Connect with your corporate partner

      Company: {companyName}

      Log in to your dashboard to get started.

      Congratulations!
      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.APPLICATION_DECLINED]: {
    subject: 'Application Update - {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      Thank you for your interest in "{projectTitle}" at {companyName}.

      After careful consideration, the corporate partner has decided to move forward with other candidates for this project.

      Don't be discouraged! There are many other opportunities waiting for you on ProveGround.

      Browse more projects: {browseProjectsUrl}

      Keep applying and building your experience!
      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.PROJECT_COMPLETED]: {
    subject: '🏆 Project Completed - {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      Congratulations on completing "{projectTitle}" with {companyName}!

      This is a great achievement to add to your portfolio. Your corporate partner may have submitted an assessment that you can view in your profile.

      What's next?
      - Request a recommendation letter
      - Browse more projects to continue building your experience
      - Update your profile with your new skills

      Keep up the great work!
      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.INVITE_RECEIVED]: {
    subject: '📩 New Project Invitation from {companyName}',
    getContent: (data) => `
      Hi {studentName},

      You've received an invitation to apply for a project!

      {companyName} thinks you'd be a great fit for: "{projectTitle}"

      Project Overview:
      {projectDescription}

      This is a great opportunity - personalized invitations mean the company is specifically interested in your profile!

      View and respond to this invitation: {invitationUrl}

      Good luck!
      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.NEW_MESSAGE]: {
    subject: 'New Message from {senderName}',
    getContent: (data) => `
      Hi {recipientName},

      You have a new message from {senderName}{companyContext}:

      "{messagePreview}"

      View full conversation: {conversationUrl}

      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.NEW_APPLICATION]: {
    subject: '📬 New Application for {projectTitle}',
    getContent: (data) => `
      Hi {companyName} Team,

      A new student has applied for your project "{projectTitle}"!

      Applicant: {studentName}
      University: {studentUniversity}
      Major: {studentMajor}

      Review their application: {applicationUrl}

      The ProveGround Team
    `,
  },

  [NOTIFICATION_TYPES.ASSESSMENT_RECEIVED]: {
    subject: 'Assessment Received for {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      {companyName} has submitted a performance assessment for your work on "{projectTitle}".

      This assessment is now part of your ProveGround profile and can be viewed by other corporate partners.

      View your assessment: {assessmentUrl}

      Keep building your experience!
      The ProveGround Team
    `,
  },
};

/**
 * Send an email notification
 *
 * @param {Object} options
 * @param {string} options.type - Notification type from NOTIFICATION_TYPES
 * @param {string} options.recipientId - Sharetribe user ID of the recipient
 * @param {string} options.recipientEmail - Email address of the recipient
 * @param {Object} options.data - Data to populate the email template
 * @returns {Promise<Object>} - Result of the notification send attempt
 */
async function sendNotification({ type, recipientId, recipientEmail, data }) {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      console.error(`Unknown notification type: ${type}`);
      return { success: false, error: 'Unknown notification type' };
    }

    // Interpolate data into template
    const subject = interpolateTemplate(template.subject, data);
    const content = interpolateTemplate(template.getContent(data), data);

    // Log the notification (for debugging and audit purposes)
    console.log(`[Notification] Sending ${type} to ${recipientEmail}`);
    console.log(`[Notification] Subject: ${subject}`);

    // For now, we'll log the notification since Sharetribe's email sending
    // is handled through their built-in notification system
    // In production, you could integrate with SendGrid, Mailgun, etc.

    // Store notification for in-app notification center
    await storeNotification({
      recipientId,
      type,
      subject,
      content,
      data,
      createdAt: new Date().toISOString(),
      read: false,
    });

    return { success: true };
  } catch (error) {
    console.error(`[Notification] Error sending ${type}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Store notification in memory/database for in-app notification center
 * In production, this would store to a database
 */
const notificationStore = new Map();

async function storeNotification(notification) {
  const { recipientId } = notification;
  const userNotifications = notificationStore.get(recipientId) || [];
  userNotifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...notification,
  });

  // Keep only last 50 notifications per user
  if (userNotifications.length > 50) {
    userNotifications.length = 50;
  }

  notificationStore.set(recipientId, userNotifications);
}

/**
 * Get notifications for a user
 */
async function getNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  const userNotifications = notificationStore.get(userId) || [];

  let filtered = unreadOnly
    ? userNotifications.filter(n => !n.read)
    : userNotifications;

  return filtered.slice(0, limit);
}

/**
 * Mark notification as read
 */
async function markNotificationRead(userId, notificationId) {
  const userNotifications = notificationStore.get(userId) || [];
  const notification = userNotifications.find(n => n.id === notificationId);

  if (notification) {
    notification.read = true;
    notification.readAt = new Date().toISOString();
  }

  return notification;
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead(userId) {
  const userNotifications = notificationStore.get(userId) || [];
  const now = new Date().toISOString();

  userNotifications.forEach(n => {
    if (!n.read) {
      n.read = true;
      n.readAt = now;
    }
  });

  return userNotifications.filter(n => n.readAt === now).length;
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
  const userNotifications = notificationStore.get(userId) || [];
  return userNotifications.filter(n => !n.read).length;
}

/**
 * Helper to interpolate template variables
 */
function interpolateTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Send notification for transaction state change
 * This is the main entry point for transaction-related notifications
 */
async function notifyTransactionStateChange({
  transaction,
  transition,
  customer,
  provider,
  listing,
}) {
  const transitionName = transition?.replace('transition/', '') || '';
  const listingTitle = listing?.attributes?.title || 'Unknown Project';
  const customerName = customer?.attributes?.profile?.displayName || 'Student';
  const customerEmail = customer?.attributes?.email;
  const customerId = customer?.id?.uuid;
  const providerName = provider?.attributes?.profile?.displayName || 'Company';
  const providerEmail = provider?.attributes?.email;
  const providerId = provider?.id?.uuid;

  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://proveground.com';

  switch (transitionName) {
    case 'request-project-application':
      // Student applied - notify the corporate partner
      await sendNotification({
        type: NOTIFICATION_TYPES.NEW_APPLICATION,
        recipientId: providerId,
        recipientEmail: providerEmail,
        data: {
          companyName: providerName,
          projectTitle: listingTitle,
          studentName: customerName,
          studentUniversity: customer?.attributes?.profile?.publicData?.university || 'Not specified',
          studentMajor: customer?.attributes?.profile?.publicData?.major || 'Not specified',
          applicationUrl: `${baseUrl}/inbox/sales`,
        },
      });

      // Also notify the student that their application was received
      await sendNotification({
        type: NOTIFICATION_TYPES.APPLICATION_RECEIVED,
        recipientId: customerId,
        recipientEmail: customerEmail,
        data: {
          studentName: customerName,
          projectTitle: listingTitle,
          companyName: providerName,
          timeline: listing?.attributes?.publicData?.timeline || 'See project details',
        },
      });
      break;

    case 'accept':
      // Application accepted - notify the student
      await sendNotification({
        type: NOTIFICATION_TYPES.APPLICATION_ACCEPTED,
        recipientId: customerId,
        recipientEmail: customerEmail,
        data: {
          studentName: customerName,
          projectTitle: listingTitle,
          companyName: providerName,
        },
      });
      break;

    case 'decline':
      // Application declined - notify the student
      await sendNotification({
        type: NOTIFICATION_TYPES.APPLICATION_DECLINED,
        recipientId: customerId,
        recipientEmail: customerEmail,
        data: {
          studentName: customerName,
          projectTitle: listingTitle,
          companyName: providerName,
          browseProjectsUrl: `${baseUrl}/s`,
        },
      });
      break;

    case 'complete':
      // Project completed - notify the student
      await sendNotification({
        type: NOTIFICATION_TYPES.PROJECT_COMPLETED,
        recipientId: customerId,
        recipientEmail: customerEmail,
        data: {
          studentName: customerName,
          projectTitle: listingTitle,
          companyName: providerName,
        },
      });
      break;

    default:
      // No notification for other transitions
      break;
  }
}

/**
 * Send invite notification
 */
async function notifyInviteToApply({
  studentId,
  studentEmail,
  studentName,
  companyName,
  projectTitle,
  projectDescription,
  listingId,
}) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://proveground.com';

  await sendNotification({
    type: NOTIFICATION_TYPES.INVITE_RECEIVED,
    recipientId: studentId,
    recipientEmail: studentEmail,
    data: {
      studentName,
      companyName,
      projectTitle,
      projectDescription: projectDescription?.substring(0, 200) + '...',
      invitationUrl: `${baseUrl}/l/${listingId}`,
    },
  });
}

/**
 * Send assessment notification
 */
async function notifyAssessmentSubmitted({
  studentId,
  studentEmail,
  studentName,
  companyName,
  projectTitle,
  transactionId,
}) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://proveground.com';

  await sendNotification({
    type: NOTIFICATION_TYPES.ASSESSMENT_RECEIVED,
    recipientId: studentId,
    recipientEmail: studentEmail,
    data: {
      studentName,
      companyName,
      projectTitle,
      assessmentUrl: `${baseUrl}/profile`,
    },
  });
}

module.exports = {
  NOTIFICATION_TYPES,
  sendNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  notifyTransactionStateChange,
  notifyInviteToApply,
  notifyAssessmentSubmitted,
};
