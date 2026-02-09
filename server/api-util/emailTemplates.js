/**
 * Email Templates for Street2Ivy
 *
 * HTML email templates with tenant branding support.
 * Each template accepts data + optional tenant branding to produce
 * institution-branded emails.
 *
 * Templates:
 * - alumniInvitation: Sent when an edu-admin invites an alumnus
 * - alumniWelcome: Sent after an alumnus accepts an invitation
 * - alumniReminder: Sent when an edu-admin resends an invitation
 * - tenantRequestReceived: Sent to edu-admin when they submit a tenant request
 * - tenantApproved: Sent to edu-admin when system admin approves tenant request
 * - tenantRejected: Sent to edu-admin when system admin rejects tenant request
 *
 * Stage 6: Email Notification Service
 */

// ================ BASE LAYOUT ================ //

/**
 * Generate the base HTML email layout with tenant branding.
 *
 * @param {Object} options
 * @param {string} options.title - Email title (for <title> tag)
 * @param {string} options.bodyContent - Inner HTML content
 * @param {Object} [options.branding] - Tenant branding overrides
 * @param {string} [options.branding.marketplaceColor] - Primary color (hex)
 * @param {string} [options.branding.marketplaceName] - Institution name
 * @param {string} [options.branding.logoUrl] - Logo URL
 * @returns {string} Full HTML email
 */
function baseLayout({ title, bodyContent, branding = {} }) {
  const primaryColor = branding.marketplaceColor || '#1c7881';
  const marketplaceName = branding.marketplaceName || 'Street2Ivy';
  const logoUrl = branding.logoUrl || null;
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
  const year = new Date().getFullYear();

  // Resolve logo URL to absolute if relative
  const absoluteLogoUrl = logoUrl
    ? (logoUrl.startsWith('http') ? logoUrl : `${baseUrl}${logoUrl}`)
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      line-height: 1.6;
    }

    .email-wrapper {
      width: 100%;
      background-color: #f5f5f5;
      padding: 32px 16px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .email-header {
      background-color: ${escapeHtml(primaryColor)};
      padding: 24px 32px;
      text-align: center;
    }

    .email-header img {
      max-height: 48px;
      max-width: 200px;
      margin-bottom: 8px;
    }

    .email-header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .email-body {
      padding: 32px;
    }

    .email-body h2 {
      margin: 0 0 16px;
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .email-body p {
      margin: 0 0 16px;
      font-size: 15px;
      color: #4a4a4a;
      line-height: 1.6;
    }

    .email-body ul {
      margin: 0 0 16px;
      padding-left: 20px;
    }

    .email-body li {
      margin-bottom: 8px;
      font-size: 15px;
      color: #4a4a4a;
    }

    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${escapeHtml(primaryColor)};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      margin: 8px 0 24px;
      text-align: center;
    }

    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid ${escapeHtml(primaryColor)};
      padding: 16px 20px;
      margin: 16px 0 24px;
      border-radius: 0 4px 4px 0;
    }

    .info-box p {
      margin: 4px 0;
      font-size: 14px;
    }

    .info-box strong {
      color: #1a1a1a;
    }

    .email-footer {
      background-color: #f8f9fa;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e7e7e7;
    }

    .email-footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #999999;
    }

    .email-footer a {
      color: ${escapeHtml(primaryColor)};
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 16px 8px; }
      .email-body { padding: 24px 20px; }
      .email-header { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        ${absoluteLogoUrl ? `<img src="${escapeHtml(absoluteLogoUrl)}" alt="${escapeHtml(marketplaceName)}" />` : ''}
        <h1>${escapeHtml(marketplaceName)}</h1>
      </div>
      <div class="email-body">
        ${bodyContent}
      </div>
      <div class="email-footer">
        <p>&copy; ${year} ${escapeHtml(marketplaceName)}. All rights reserved.</p>
        <p>Powered by <a href="https://street2ivy.com">Street2Ivy</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ================ TEMPLATE DEFINITIONS ================ //

/**
 * Alumni Invitation Email
 * Sent when an edu-admin invites an alumnus to join the platform.
 *
 * @param {Object} data
 * @param {string} data.firstName - Alumni first name
 * @param {string} data.lastName - Alumni last name
 * @param {string} data.email - Alumni email
 * @param {string} data.institutionName - Institution display name
 * @param {string} data.invitationCode - Invitation code
 * @param {string} [data.graduationYear] - Graduation year
 * @param {string} [data.program] - Program/major
 * @param {string} [data.invitedByName] - Name of the admin who invited them
 * @param {Object} [data.branding] - Tenant branding
 * @returns {Object} { subject, html }
 */
function alumniInvitation(data) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
  const joinUrl = `${baseUrl}/alumni/join/${data.invitationCode}`;
  const institutionName = data.institutionName || data.branding?.marketplaceName || 'your institution';

  const subject = `You're invited to join ${institutionName} on Street2Ivy`;

  const bodyContent = `
    <h2>Welcome, ${escapeHtml(data.firstName)}!</h2>
    <p>
      ${data.invitedByName ? `${escapeHtml(data.invitedByName)} from ` : ''}${escapeHtml(institutionName)}
      has invited you to join the alumni network on Street2Ivy.
    </p>
    <p>
      As an alumnus, you can create real-world projects for current students,
      mentor the next generation, and stay connected with your alma mater.
    </p>

    <div class="info-box">
      <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Institution:</strong> ${escapeHtml(institutionName)}</p>
      ${data.graduationYear ? `<p><strong>Graduation Year:</strong> ${escapeHtml(data.graduationYear)}</p>` : ''}
      ${data.program ? `<p><strong>Program:</strong> ${escapeHtml(data.program)}</p>` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${escapeHtml(joinUrl)}" class="cta-button">Accept Invitation &amp; Create Account</a>
    </p>

    <p style="font-size: 13px; color: #888;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(joinUrl)}" style="color: #1c7881; word-break: break-all;">${escapeHtml(joinUrl)}</a>
    </p>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'alumniInvitation',
  };
}

/**
 * Alumni Welcome Email
 * Sent after an alumnus accepts an invitation and creates their account.
 *
 * @param {Object} data
 * @param {string} data.firstName - Alumni first name
 * @param {string} data.lastName - Alumni last name
 * @param {string} data.institutionName - Institution display name
 * @param {Object} [data.branding] - Tenant branding
 * @returns {Object} { subject, html }
 */
function alumniWelcome(data) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
  const dashboardUrl = `${baseUrl}/alumni/dashboard`;
  const institutionName = data.institutionName || data.branding?.marketplaceName || 'your institution';

  const subject = `Welcome to Street2Ivy, ${data.firstName}!`;

  const bodyContent = `
    <h2>You're all set, ${escapeHtml(data.firstName)}!</h2>
    <p>
      Welcome to the ${escapeHtml(institutionName)} alumni network on Street2Ivy.
      Your account has been created and you're ready to make an impact.
    </p>

    <p><strong>Here's what you can do:</strong></p>
    <ul>
      <li><strong>Create Projects</strong> &mdash; Post real-world challenges for students to solve</li>
      <li><strong>Mentor Students</strong> &mdash; Guide the next generation of talent</li>
      <li><strong>Build Your Network</strong> &mdash; Connect with fellow alumni and students</li>
      <li><strong>Track Impact</strong> &mdash; See how your projects help students grow</li>
    </ul>

    <p style="text-align: center;">
      <a href="${escapeHtml(dashboardUrl)}" class="cta-button">Go to Your Dashboard</a>
    </p>

    <p>
      If you have any questions, reach out to your institution's admin or
      contact us at <a href="mailto:support@street2ivy.com">support@street2ivy.com</a>.
    </p>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'alumniWelcome',
  };
}

/**
 * Alumni Reminder Email
 * Sent when an edu-admin resends an invitation.
 *
 * @param {Object} data
 * @param {string} data.firstName - Alumni first name
 * @param {string} data.email - Alumni email
 * @param {string} data.institutionName - Institution display name
 * @param {string} data.invitationCode - New invitation code
 * @param {Object} [data.branding] - Tenant branding
 * @returns {Object} { subject, html }
 */
function alumniReminder(data) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
  const joinUrl = `${baseUrl}/alumni/join/${data.invitationCode}`;
  const institutionName = data.institutionName || data.branding?.marketplaceName || 'your institution';

  const subject = `Reminder: You're invited to join ${institutionName} on Street2Ivy`;

  const bodyContent = `
    <h2>Hi ${escapeHtml(data.firstName)},</h2>
    <p>
      This is a friendly reminder that you've been invited to join the
      ${escapeHtml(institutionName)} alumni network on Street2Ivy.
    </p>
    <p>
      Your previous invitation link has been updated. Please use the link below
      to accept your invitation and create your account.
    </p>

    <p style="text-align: center;">
      <a href="${escapeHtml(joinUrl)}" class="cta-button">Accept Invitation</a>
    </p>

    <p style="font-size: 13px; color: #888;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(joinUrl)}" style="color: #1c7881; word-break: break-all;">${escapeHtml(joinUrl)}</a>
    </p>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'alumniReminder',
  };
}

/**
 * Tenant Request Received Email
 * Sent to the edu-admin when they submit a tenant request.
 *
 * @param {Object} data
 * @param {string} data.adminName - Admin's name
 * @param {string} data.adminEmail - Admin's email
 * @param {string} data.institutionName - Institution name
 * @param {string} data.requestId - Request ID
 * @param {Object} [data.branding] - Tenant branding (usually empty for new requests)
 * @returns {Object} { subject, html }
 */
function tenantRequestReceived(data) {
  const subject = `Tenant Request Received - ${data.institutionName}`;

  const bodyContent = `
    <h2>Request Received</h2>
    <p>
      Hi ${escapeHtml(data.adminName)},
    </p>
    <p>
      Thank you for submitting a tenant request for <strong>${escapeHtml(data.institutionName)}</strong>
      on Street2Ivy. Our team will review your request and get back to you shortly.
    </p>

    <div class="info-box">
      <p><strong>Request ID:</strong> ${escapeHtml(data.requestId)}</p>
      <p><strong>Institution:</strong> ${escapeHtml(data.institutionName)}</p>
      <p><strong>Admin:</strong> ${escapeHtml(data.adminName)} (${escapeHtml(data.adminEmail)})</p>
      <p><strong>Status:</strong> Pending Review</p>
    </div>

    <p>
      You'll receive an email notification once your request has been reviewed.
      In the meantime, if you have any questions, contact us at
      <a href="mailto:support@street2ivy.com">support@street2ivy.com</a>.
    </p>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'tenantRequestReceived',
  };
}

/**
 * Tenant Approved Email
 * Sent to the edu-admin when system admin approves the tenant request.
 *
 * @param {Object} data
 * @param {string} data.adminName - Admin's name
 * @param {string} data.adminEmail - Admin's email
 * @param {string} data.institutionName - Institution name
 * @param {string} data.tenantId - New tenant ID
 * @param {Object} [data.branding] - Tenant branding
 * @returns {Object} { subject, html }
 */
function tenantApproved(data) {
  const baseUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
  const dashboardUrl = `${baseUrl}/education/dashboard`;

  const subject = `Your tenant request has been approved - ${data.institutionName}`;

  const bodyContent = `
    <h2>Congratulations, ${escapeHtml(data.adminName)}!</h2>
    <p>
      Your tenant request for <strong>${escapeHtml(data.institutionName)}</strong>
      has been approved! Your institution's tenant is now in <strong>onboarding</strong> status.
    </p>

    <p><strong>Next steps:</strong></p>
    <ul>
      <li>Set up your institution's branding (colors, logo, name)</li>
      <li>Configure features (AI coaching, NDA, assessments)</li>
      <li>Invite alumni to join the network</li>
      <li>Activate your tenant when ready</li>
    </ul>

    <p style="text-align: center;">
      <a href="${escapeHtml(dashboardUrl)}" class="cta-button">Go to Dashboard</a>
    </p>

    <div class="info-box">
      <p><strong>Tenant ID:</strong> ${escapeHtml(data.tenantId)}</p>
      <p><strong>Status:</strong> Onboarding</p>
    </div>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'tenantApproved',
  };
}

/**
 * Tenant Rejected Email
 * Sent to the edu-admin when system admin rejects the tenant request.
 *
 * @param {Object} data
 * @param {string} data.adminName - Admin's name
 * @param {string} data.adminEmail - Admin's email
 * @param {string} data.institutionName - Institution name
 * @param {string} [data.rejectionReason] - Optional reason for rejection
 * @param {Object} [data.branding] - Tenant branding
 * @returns {Object} { subject, html }
 */
function tenantRejected(data) {
  const subject = `Tenant request update - ${data.institutionName}`;

  const bodyContent = `
    <h2>Request Update</h2>
    <p>
      Hi ${escapeHtml(data.adminName)},
    </p>
    <p>
      After careful review, your tenant request for <strong>${escapeHtml(data.institutionName)}</strong>
      has not been approved at this time.
    </p>

    ${data.rejectionReason ? `
    <div class="info-box">
      <p><strong>Reason:</strong> ${escapeHtml(data.rejectionReason)}</p>
    </div>
    ` : ''}

    <p>
      If you believe this was in error or would like to discuss further,
      please contact our team at <a href="mailto:support@street2ivy.com">support@street2ivy.com</a>.
    </p>
    <p>
      You're welcome to submit a new request with additional information.
    </p>
  `;

  return {
    subject,
    html: baseLayout({ title: subject, bodyContent, branding: data.branding }),
    templateName: 'tenantRejected',
  };
}

// ================ TEMPLATE REGISTRY ================ //

/**
 * All available templates, keyed by name.
 */
const TEMPLATES = {
  alumniInvitation,
  alumniWelcome,
  alumniReminder,
  tenantRequestReceived,
  tenantApproved,
  tenantRejected,
};

/**
 * Get a list of all available template names.
 * @returns {string[]}
 */
function getTemplateNames() {
  return Object.keys(TEMPLATES);
}

/**
 * Render a template by name with the provided data.
 *
 * @param {string} templateName - Template identifier
 * @param {Object} data - Template data
 * @returns {Object} { subject, html, templateName }
 * @throws {Error} If template name is not found
 */
function renderTemplate(templateName, data) {
  const templateFn = TEMPLATES[templateName];
  if (!templateFn) {
    throw new Error(`Unknown email template: "${templateName}". Available: ${getTemplateNames().join(', ')}`);
  }
  return templateFn(data);
}

// ================ UTILITIES ================ //

/**
 * Escape HTML entities for safe embedding in templates.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  // Templates
  alumniInvitation,
  alumniWelcome,
  alumniReminder,
  tenantRequestReceived,
  tenantApproved,
  tenantRejected,
  // Registry
  TEMPLATES,
  getTemplateNames,
  renderTemplate,
  // Utilities
  baseLayout,
  escapeHtml,
};
