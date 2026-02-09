/**
 * Admin Email Management API
 *
 * System admin-only endpoints for email service management:
 * - Service status / health check
 * - SMTP connection verification
 * - Template preview (renders template with sample data)
 * - Send test email
 * - Email log viewer
 *
 * Stage 6: Email Notification Service
 */

const { verifySystemAdmin } = require('../../api-util/security');
const {
  sendEmail,
  getServiceStatus,
  verifyConnection,
  getEmailLog,
  getRateLimitStatus,
} = require('../../api-util/emailService');
const {
  getTemplateNames,
  renderTemplate,
} = require('../../api-util/emailTemplates');

// ================ SAMPLE DATA FOR PREVIEW ================ //

const SAMPLE_DATA = {
  alumniInvitation: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    institutionName: 'Harvard University',
    invitationCode: 'abc123def456',
    graduationYear: '2020',
    program: 'Computer Science',
    invitedByName: 'Dr. Smith',
    branding: {
      marketplaceColor: '#A51C30',
      marketplaceName: 'Harvard x Street2Ivy',
      logoUrl: null,
    },
  },
  alumniWelcome: {
    firstName: 'Jane',
    lastName: 'Doe',
    institutionName: 'Harvard University',
    branding: {
      marketplaceColor: '#A51C30',
      marketplaceName: 'Harvard x Street2Ivy',
      logoUrl: null,
    },
  },
  alumniReminder: {
    firstName: 'Jane',
    email: 'jane.doe@example.com',
    institutionName: 'Harvard University',
    invitationCode: 'abc123def456',
    branding: {
      marketplaceColor: '#A51C30',
      marketplaceName: 'Harvard x Street2Ivy',
      logoUrl: null,
    },
  },
  tenantRequestReceived: {
    adminName: 'Dr. Smith',
    adminEmail: 'smith@harvard.edu',
    institutionName: 'Harvard University',
    requestId: 'req_abc123',
  },
  tenantApproved: {
    adminName: 'Dr. Smith',
    adminEmail: 'smith@harvard.edu',
    institutionName: 'Harvard University',
    tenantId: 'harvard',
  },
  tenantRejected: {
    adminName: 'Dr. Smith',
    adminEmail: 'smith@harvard.edu',
    institutionName: 'Example University',
    rejectionReason: 'Institution not yet verified. Please submit documentation.',
  },
};

// ================ API HANDLERS ================ //

/**
 * Get email service status
 * GET /api/admin/email/status
 */
async function getStatus(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const status = getServiceStatus();
    const rateLimit = getRateLimitStatus();

    res.status(200).json({
      data: {
        ...status,
        rateLimit,
        availableTemplates: getTemplateNames(),
      },
    });
  } catch (e) {
    console.error('Error getting email status:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify SMTP connection
 * POST /api/admin/email/verify
 */
async function verifySmtp(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const result = await verifyConnection();

    res.status(200).json({ data: result });
  } catch (e) {
    console.error('Error verifying SMTP:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Preview a template (render with sample data)
 * GET /api/admin/email/preview/:templateName
 *
 * Query params:
 *   - format: 'html' (returns raw HTML) or 'json' (returns subject + html). Default: 'json'
 */
async function previewTemplate(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { templateName } = req.params;
    const { format } = req.query;

    // Use sample data, or custom data from request body if provided
    const sampleData = SAMPLE_DATA[templateName];
    if (!sampleData) {
      return res.status(404).json({
        error: `Unknown template: "${templateName}". Available: ${getTemplateNames().join(', ')}`,
      });
    }

    // Allow overriding sample data with request body (for custom previews)
    const data = req.body && Object.keys(req.body).length > 0
      ? { ...sampleData, ...req.body }
      : sampleData;

    const rendered = renderTemplate(templateName, data);

    if (format === 'html') {
      // Return raw HTML for browser preview
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(rendered.html);
    }

    // Default: JSON response
    res.status(200).json({
      data: {
        templateName: rendered.templateName,
        subject: rendered.subject,
        html: rendered.html,
        sampleData: data,
      },
    });
  } catch (e) {
    console.error('Error previewing template:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

/**
 * Send a test email
 * POST /api/admin/email/test
 *
 * Body: {
 *   templateName: string (required),
 *   to: string (required) - recipient email,
 *   data: object (optional) - custom template data overrides,
 * }
 */
async function sendTestEmail(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { templateName, to, data: customData } = req.body;

    if (!templateName || !to) {
      return res.status(400).json({ error: 'templateName and to are required.' });
    }

    // Validate template exists
    const sampleData = SAMPLE_DATA[templateName];
    if (!sampleData) {
      return res.status(404).json({
        error: `Unknown template: "${templateName}". Available: ${getTemplateNames().join(', ')}`,
      });
    }

    // Merge sample data with custom overrides
    const data = customData ? { ...sampleData, ...customData } : sampleData;
    const rendered = renderTemplate(templateName, data);

    // Send the email
    const result = await sendEmail({
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      templateName: `test_${rendered.templateName}`,
      metadata: { isTest: true, sentBy: admin.id?.uuid || 'system-admin' },
    });

    res.status(200).json({ data: result });
  } catch (e) {
    console.error('Error sending test email:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

/**
 * Get email log
 * GET /api/admin/email/log
 *
 * Query params:
 *   - limit: number (default 50, max 200)
 *   - status: 'sent' | 'failed' | 'logged' | 'disabled' | 'rate_limited'
 *   - templateName: filter by template
 */
async function getLog(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { limit, status, templateName } = req.query;
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);

    const log = getEmailLog({
      limit: parsedLimit,
      status,
      templateName,
    });

    res.status(200).json({ data: log, total: log.length });
  } catch (e) {
    console.error('Error getting email log:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getStatus,
  verifySmtp,
  previewTemplate,
  sendTestEmail,
  getLog,
};
