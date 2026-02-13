/**
 * Email Notification Service for Street2Ivy
 *
 * This module handles sending email notifications for key platform events:
 * - Transaction state changes (application received, accepted, declined, completed)
 * - Project invitations
 * - Messages from corporate partners
 * - Assessment completions
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('./db');
const { getIntegrationSdk } = require('./sdk');
const { sendEmail } = require('../services/email');

// Email notification types
const NOTIFICATION_TYPES = {
  APPLICATION_RECEIVED: 'application-received',
  APPLICATION_ACCEPTED: 'application-accepted',
  APPLICATION_DECLINED: 'application-declined',
  PROJECT_COMPLETED: 'project-completed',
  INVITE_RECEIVED: 'invite-received',
  NEW_MESSAGE: 'new-message',
  ASSESSMENT_RECEIVED: 'assessment-received',
  NEW_APPLICATION: 'new-application',
  STUDENT_ACCEPTED_INVITE: 'student-accepted-invite',
  DELIVERABLE_SUBMITTED: 'deliverable-submitted',
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
      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.APPLICATION_ACCEPTED]: {
    subject: 'Congratulations! Your Application Was Accepted',
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
      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.APPLICATION_DECLINED]: {
    subject: 'Application Update - {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      Thank you for your interest in "{projectTitle}" at {companyName}.

      After careful consideration, the corporate partner has decided to move forward with other candidates for this project.

      Don't be discouraged! There are many other opportunities waiting for you on Campus2Career.

      Browse more projects: {browseProjectsUrl}

      Keep applying and building your experience!
      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.PROJECT_COMPLETED]: {
    subject: 'Project Completed - {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      Congratulations on completing "{projectTitle}" with {companyName}!

      This is a great achievement to add to your portfolio. Your corporate partner may have submitted an assessment that you can view in your profile.

      What's next?
      - Request a recommendation letter
      - Browse more projects to continue building your experience
      - Update your profile with your new skills

      Keep up the great work!
      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.INVITE_RECEIVED]: {
    subject: 'New Project Invitation from {companyName}',
    getContent: (data) => `
      Hi {studentName},

      You've received an invitation to apply for a project!

      {companyName} thinks you'd be a great fit for: "{projectTitle}"

      Project Overview:
      {projectDescription}

      This is a great opportunity - personalized invitations mean the company is specifically interested in your profile!

      View and respond to this invitation: {invitationUrl}

      Good luck!
      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.NEW_MESSAGE]: {
    subject: 'New Message from {senderName}',
    getContent: (data) => `
      Hi {recipientName},

      You have a new message from {senderName}{companyContext}:

      "{messagePreview}"

      View full conversation: {conversationUrl}

      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.NEW_APPLICATION]: {
    subject: 'New Application for {projectTitle}',
    getContent: (data) => `
      Hi {companyName} Team,

      A new student has applied for your project "{projectTitle}"!

      Applicant: {studentName}
      University: {studentUniversity}
      Major: {studentMajor}

      Review their application: {applicationUrl}

      The Street2Ivy Team
    `,
  },
  [NOTIFICATION_TYPES.ASSESSMENT_RECEIVED]: {
    subject: 'Assessment Received for {projectTitle}',
    getContent: (data) => `
      Hi {studentName},

      {companyName} has submitted a performance assessment for your work on "{projectTitle}".

      This assessment is now part of your Campus2Career profile and can be viewed by other corporate partners.

      View your assessment: {assessmentUrl}

      Keep building your experience!
      The Street2Ivy Team
    `,
  },
};

/**
 * Send an email notification
 */
async function sendNotification({ type, recipientId, recipientEmail, data }) {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      console.error(`Unknown notification type: ${type}`);
      return { success: false, error: 'Unknown notification type' };
    }

    const subject = interpolateTemplate(template.subject, data);
    const content = interpolateTemplate(template.getContent(data), data);

    console.log(`[Notification] Sending ${type} to ${recipientEmail}`);
    console.log(`[Notification] Subject: ${subject}`);

    // Store notification in SQLite for in-app notification center
    await storeNotification({
      recipientId,
      type,
      subject,
      content,
      data,
      createdAt: new Date().toISOString(),
      read: false,
    });

    // Send email via Mailgun (non-blocking — email failure should not break notification)
    if (recipientEmail) {
      try {
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject,
          text: content,
          tags: { 'o:tag': [type] },
        });
        if (emailResult.success) {
          console.log(`[Notification] Email sent for ${type} to ${recipientEmail}`);
        } else {
          console.warn(`[Notification] Email skipped for ${type}: ${emailResult.error}`);
        }
      } catch (emailError) {
        // Non-critical: email failure should not break the notification flow
        console.error(`[Notification] Email error for ${type}:`, emailError.message);
      }
    } else {
      console.log(`[Notification] No email address for ${type} — in-app only`);
    }

    return { success: true };
  } catch (error) {
    console.error(`[Notification] Error sending ${type}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Store notification in SQLite for in-app notification center
 */
async function storeNotification(notification) {
  const { recipientId } = notification;

  db.notifications.create({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    recipientId,
    type: notification.type,
    subject: notification.subject,
    content: notification.content,
    data: notification.data,
    read: notification.read || false,
    readAt: null,
    createdAt: notification.createdAt || new Date().toISOString(),
  });
}

/**
 * Get notifications for a user
 */
async function getNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  return db.notifications.getByUserId(userId, { limit, unreadOnly });
}

/**
 * Mark notification as read
 */
async function markNotificationRead(userId, notificationId) {
  return db.notifications.markRead(userId, notificationId);
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead(userId) {
  return db.notifications.markAllRead(userId);
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
  return db.notifications.getUnreadCount(userId);
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

  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';

  switch (transitionName) {
    // Initial application — the process uses 'transition/inquire-without-payment'
    // Also handle legacy 'request-project-application' for backward compatibility
    case 'inquire-without-payment':
    case 'request-project-application':
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

    // Project marked as completed — the process uses 'transition/mark-completed'
    // Also handle legacy 'complete' for backward compatibility
    case 'mark-completed':
    case 'complete':
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
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';

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
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';

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
