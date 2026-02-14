/**
 * Email Status & Test Endpoints
 *
 * Admin-only endpoints for verifying Mailgun email configuration
 * and sending test emails.
 *
 * GET  /api/email-status  — Returns current email/Mailgun config status
 * POST /api/email-test    — Sends a test email to the current admin's address
 */

const { verifySystemAdmin } = require('../api-util/security');
const { sendEmail, isEmailEnabled } = require('../services/email');

/**
 * GET /api/email-status
 *
 * Returns JSON with the current Mailgun/email configuration status.
 * Protected: requires authenticated user with system-admin role.
 */
const getEmailStatus = async (req, res) => {
  const admin = await verifySystemAdmin(req, res);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const hasMailgunKey = !!process.env.MAILGUN_API_KEY;
  const hasMailgunDomain = !!process.env.MAILGUN_DOMAIN;
  const hasIntegrationSecret = !!process.env.SHARETRIBE_SDK_CLIENT_SECRET;
  const emailEnabled = isEmailEnabled();

  const fromName = process.env.MAILGUN_FROM_NAME || 'Campus2Career';
  const fromEmail =
    process.env.MAILGUN_FROM_EMAIL || `noreply@${process.env.MAILGUN_DOMAIN || 'street2ivy.com'}`;

  return res.status(200).json({
    mailgunConfigured: hasMailgunKey && hasMailgunDomain,
    mailgunDomain: hasMailgunDomain ? process.env.MAILGUN_DOMAIN : null,
    emailEnabled,
    integrationSdkAvailable: hasIntegrationSecret,
    fromAddress: `${fromName} <${fromEmail}>`,
    diagnostics: {
      MAILGUN_API_KEY: hasMailgunKey ? 'Set' : 'MISSING',
      MAILGUN_DOMAIN: hasMailgunDomain ? process.env.MAILGUN_DOMAIN : 'MISSING',
      EMAIL_ENABLED: process.env.EMAIL_ENABLED || '(not set — defaults to auto)',
      MAILGUN_FROM_NAME: process.env.MAILGUN_FROM_NAME || '(not set — defaults to Campus2Career)',
      MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL || '(not set — defaults to noreply@domain)',
      SHARETRIBE_SDK_CLIENT_SECRET: hasIntegrationSecret ? 'Set' : 'MISSING',
    },
  });
};

/**
 * POST /api/email-test
 *
 * Sends a test email to the current admin user's email address.
 * Uses the existing sendEmail() function from server/services/email.js.
 * Protected: requires authenticated user with system-admin role.
 */
const sendTestEmail = async (req, res) => {
  const admin = await verifySystemAdmin(req, res);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const adminEmail = admin?.attributes?.email;
  if (!adminEmail) {
    return res.status(400).json({
      success: false,
      error: 'Could not determine admin email address',
    });
  }

  const adminName =
    admin?.attributes?.profile?.displayName ||
    admin?.attributes?.profile?.firstName ||
    'Admin';

  try {
    const result = await sendEmail({
      to: adminEmail,
      subject: 'Campus2Career Email Test',
      text: `Hello ${adminName},\n\nThis is a test email from Campus2Career to verify your Mailgun email delivery is working correctly.\n\nIf you're reading this, email delivery is configured and operational.\n\nTimestamp: ${new Date().toISOString()}\n\n— The Campus2Career Team`,
      type: 'test',
      data: { adminName, timestamp: new Date().toISOString() },
      tags: { 'o:tag': ['test', 'admin'] },
    });

    return res.status(200).json({
      success: result.success,
      messageId: result.messageId,
      sentTo: adminEmail,
      error: result.error || undefined,
    });
  } catch (error) {
    console.error('[EmailTest] Failed:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getEmailStatus,
  sendTestEmail,
};
