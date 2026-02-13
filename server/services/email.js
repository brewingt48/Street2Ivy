/**
 * Mailgun Email Service for Street2Ivy / Campus2Career
 *
 * Sends transactional emails for platform events using Mailgun.
 *
 * Environment variables (provisioned via Heroku Mailgun add-on):
 *   MAILGUN_API_KEY   – API key for Mailgun
 *   MAILGUN_DOMAIN    – Sending domain (e.g. mg.street2ivy.com or sandbox domain)
 *
 * Optional:
 *   MAILGUN_FROM_NAME  – Display name in From header (default: "Campus2Career")
 *   MAILGUN_FROM_EMAIL – From address (default: noreply@<MAILGUN_DOMAIN>)
 *   EMAIL_ENABLED       – Set to "false" to disable sending (still logs)
 */

const Mailgun = require('mailgun.js');
const formData = require('form-data');

// ─── Mailgun Client ───────────────────────────────────────────────────────────

let mgClient = null;

function getMailgunClient() {
  if (mgClient) return mgClient;

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    console.warn('[Email] Mailgun not configured — MAILGUN_API_KEY or MAILGUN_DOMAIN missing');
    return null;
  }

  const mailgun = new Mailgun(formData);
  mgClient = mailgun.client({
    username: 'api',
    key: apiKey,
  });

  return mgClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEmailEnabled() {
  // Explicitly disabled via env var
  if (process.env.EMAIL_ENABLED === 'false') return false;
  // Must have Mailgun credentials
  return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
}

function getFromAddress() {
  const name = process.env.MAILGUN_FROM_NAME || 'Campus2Career';
  const email =
    process.env.MAILGUN_FROM_EMAIL || `noreply@${process.env.MAILGUN_DOMAIN || 'street2ivy.com'}`;
  return `${name} <${email}>`;
}

// ─── Plain-text → simple HTML ─────────────────────────────────────────────────

/**
 * Wraps plain-text notification content in a clean, branded HTML email.
 * This is the "Phase 2" simple version; Phase 4 will replace with
 * professionally designed templates.
 */
function wrapInHtmlTemplate(subject, plainTextBody) {
  // Trim leading/trailing whitespace from each line and convert to HTML
  const lines = plainTextBody
    .split('\n')
    .map(l => l.trim())
    .filter((l, i, arr) => {
      // Remove leading blank lines
      if (i === 0 && l === '') return false;
      // Remove trailing blank lines
      if (i === arr.length - 1 && l === '') return false;
      return true;
    });

  const htmlBody = lines
    .map(line => {
      if (line === '') return '<br/>';
      // Convert URLs to clickable links
      const withLinks = line.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#0d9488;text-decoration:underline;">$1</a>'
      );
      // Bold lines that look like section headers (end with ':')
      if (line.endsWith(':') && line.length < 60) {
        return `<p style="margin:0 0 4px 0;"><strong>${withLinks}</strong></p>`;
      }
      // List items starting with "- " or numbered "1. "
      if (/^\d+\.\s/.test(line) || line.startsWith('- ')) {
        return `<p style="margin:0 0 2px 16px;">${withLinks}</p>`;
      }
      return `<p style="margin:0 0 8px 0;">${withLinks}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;font-family:'Playfair Display',Georgia,serif;">Campus2Career</span>
              <span style="font-size:12px;color:#94a3b8;margin-left:8px;">by Street2Ivy</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.6;color:#334155;">
              ${htmlBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
              <p style="margin:0 0 4px 0;">Street2Ivy, Inc. &middot; Campus2Career Platform</p>
              <p style="margin:0;">You received this email because you have an account on Campus2Career.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a transactional email via Mailgun.
 *
 * @param {Object} options
 * @param {string} options.to        - Recipient email address
 * @param {string} options.subject   - Email subject line
 * @param {string} options.text      - Plain-text body
 * @param {string} [options.html]    - HTML body (auto-generated from text if omitted)
 * @param {Object} [options.tags]    - Mailgun tags for analytics (e.g. { 'o:tag': ['application'] })
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmail({ to, subject, text, html, tags = {} }) {
  if (!to) {
    console.warn('[Email] No recipient address — skipping send');
    return { success: false, error: 'No recipient email address' };
  }

  if (!isEmailEnabled()) {
    console.log(`[Email] Disabled or not configured — would send "${subject}" to ${to}`);
    return { success: true, messageId: 'disabled' };
  }

  const client = getMailgunClient();
  if (!client) {
    console.warn('[Email] Mailgun client unavailable — skipping send');
    return { success: false, error: 'Mailgun client not available' };
  }

  const domain = process.env.MAILGUN_DOMAIN;
  const htmlContent = html || wrapInHtmlTemplate(subject, text);

  try {
    const result = await client.messages.create(domain, {
      from: getFromAddress(),
      to: [to],
      subject,
      text,
      html: htmlContent,
      ...tags,
    });

    console.log(`[Email] Sent "${subject}" to ${to} — id: ${result.id}`);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  isEmailEnabled,
};
