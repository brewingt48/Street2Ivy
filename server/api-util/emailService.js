/**
 * Email Service for Street2Ivy
 *
 * Provides SMTP email sending with graceful degradation.
 * If SMTP environment variables are not configured, the service
 * initializes without crashing and logs emails to console instead.
 *
 * Features:
 * - Graceful degradation (no SMTP = console-only logging)
 * - Rate limiting (configurable, default 50 emails/minute)
 * - Retry on transient failures (up to 2 retries with exponential backoff)
 * - EMAIL_ENABLED flag to disable all email sending
 * - Persistent email log via jsonStore
 *
 * Stage 6: Email Notification Service
 */

const nodemailer = require('nodemailer');
const path = require('path');
const { readJSON, atomicWriteJSON } = require('./jsonStore');

// ================ CONFIGURATION ================ //

const EMAIL_LOG_FILE = path.join(__dirname, '../data/email-log.json');

/**
 * Read email configuration from environment variables.
 * All values are optional — missing values disable SMTP transport.
 */
function getEmailConfig() {
  return {
    enabled: process.env.EMAIL_ENABLED !== 'false', // default: true (but still needs SMTP)
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpUser: process.env.SMTP_USER || null,
    smtpPass: process.env.SMTP_PASS || null,
    smtpSecure: process.env.SMTP_SECURE === 'true', // TLS (port 465)
    fromEmail: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@street2ivy.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Street2Ivy',
    rateLimitPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 50,
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES, 10) || 2,
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 5000,
  };
}

// ================ TRANSPORTER ================ //

let _transporter = null;
let _transporterReady = false;

/**
 * Initialize the SMTP transporter.
 * Returns null if SMTP is not configured (graceful degradation).
 */
function initTransporter() {
  const config = getEmailConfig();

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.log('[EmailService] SMTP not configured. Emails will be logged to console only.');
    _transporterReady = false;
    _transporter = null;
    return null;
  }

  try {
    _transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      // Connection pool settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeouts
      connectionTimeout: 10000, // 10s
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });

    _transporterReady = true;
    console.log(`[EmailService] SMTP transporter initialized (${config.smtpHost}:${config.smtpPort})`);
    return _transporter;
  } catch (error) {
    console.error('[EmailService] Failed to initialize SMTP transporter:', error.message);
    _transporterReady = false;
    _transporter = null;
    return null;
  }
}

/**
 * Get the current transporter (lazy initialization).
 */
function getTransporter() {
  if (_transporter === null && !_transporterReady) {
    initTransporter();
  }
  return _transporter;
}

/**
 * Check if SMTP is available and ready.
 */
function isSmtpReady() {
  return _transporterReady && _transporter !== null;
}

// ================ RATE LIMITING ================ //

const _rateLimitWindow = [];

/**
 * Check if we can send another email within the rate limit.
 * Uses a sliding window of 1 minute.
 *
 * @returns {boolean} Whether sending is allowed
 */
function checkRateLimit() {
  const config = getEmailConfig();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  // Remove entries older than the window
  while (_rateLimitWindow.length > 0 && _rateLimitWindow[0] < now - windowMs) {
    _rateLimitWindow.shift();
  }

  if (_rateLimitWindow.length >= config.rateLimitPerMinute) {
    return false;
  }

  _rateLimitWindow.push(now);
  return true;
}

/**
 * Get current rate limit status.
 */
function getRateLimitStatus() {
  const config = getEmailConfig();
  const now = Date.now();
  const windowMs = 60 * 1000;

  // Clean old entries
  while (_rateLimitWindow.length > 0 && _rateLimitWindow[0] < now - windowMs) {
    _rateLimitWindow.shift();
  }

  return {
    sent: _rateLimitWindow.length,
    limit: config.rateLimitPerMinute,
    remaining: Math.max(0, config.rateLimitPerMinute - _rateLimitWindow.length),
    resetMs: _rateLimitWindow.length > 0
      ? windowMs - (now - _rateLimitWindow[0])
      : 0,
  };
}

// ================ EMAIL LOGGING ================ //

/**
 * Log an email send attempt to the persistent log.
 *
 * @param {Object} entry - Log entry
 * @param {string} entry.to - Recipient email
 * @param {string} entry.subject - Email subject
 * @param {string} entry.templateName - Template identifier
 * @param {string} entry.status - 'sent' | 'failed' | 'logged' (console only)
 * @param {string} [entry.error] - Error message if failed
 * @param {string} [entry.messageId] - SMTP message ID if sent
 */
async function logEmail(entry) {
  try {
    const log = readJSON(EMAIL_LOG_FILE, []);

    log.push({
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      ...entry,
      timestamp: new Date().toISOString(),
    });

    // Keep only the last 1000 entries
    if (log.length > 1000) {
      log.splice(0, log.length - 1000);
    }

    await atomicWriteJSON(EMAIL_LOG_FILE, log);
  } catch (err) {
    // Non-fatal: logging should never break email sending
    console.error('[EmailService] Failed to write email log:', err.message);
  }
}

/**
 * Get email log entries.
 *
 * @param {Object} options
 * @param {number} options.limit - Max entries to return (default 50)
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.templateName] - Filter by template
 * @returns {Array} Log entries (newest first)
 */
function getEmailLog({ limit = 50, status, templateName } = {}) {
  const log = readJSON(EMAIL_LOG_FILE, []);

  let filtered = log;
  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }
  if (templateName) {
    filtered = filtered.filter(e => e.templateName === templateName);
  }

  // Newest first
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return filtered.slice(0, limit);
}

// ================ RETRY LOGIC ================ //

/**
 * Determine if an SMTP error is retryable.
 *
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isRetryableError(error) {
  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
    return true;
  }

  // Temporary SMTP failures (4xx responses)
  if (error.responseCode && error.responseCode >= 400 && error.responseCode < 500) {
    return true;
  }

  // Specific transient errors
  const message = (error.message || '').toLowerCase();
  if (message.includes('timeout') || message.includes('connection') ||
      message.includes('rate limit') || message.includes('try again')) {
    return true;
  }

  return false;
}

/**
 * Send an email with retry logic.
 *
 * @param {Object} mailOptions - Nodemailer mail options
 * @returns {Promise<Object>} Send result
 */
async function sendWithRetry(mailOptions) {
  const config = getEmailConfig();
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        throw new Error('SMTP transporter not available');
      }

      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      lastError = error;

      if (attempt >= config.maxRetries) {
        break;
      }

      if (!isRetryableError(error)) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        config.baseRetryDelayMs * Math.pow(2, attempt) + Math.random() * config.baseRetryDelayMs * 0.5,
        config.maxRetryDelayMs
      );

      console.log(`[EmailService] Retry ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ================ PUBLIC API ================ //

/**
 * Send an email.
 *
 * If SMTP is not configured, logs to console and returns { success: true, mode: 'console' }.
 * If EMAIL_ENABLED is false, returns { success: false, reason: 'disabled' }.
 * If rate limited, returns { success: false, reason: 'rate_limited' }.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body (auto-generated from HTML if not provided)
 * @param {string} [options.templateName] - Template identifier for logging
 * @param {Object} [options.metadata] - Additional metadata for logging
 * @returns {Promise<Object>} Result with success, mode, messageId
 */
async function sendEmail({ to, subject, html, text, templateName = 'unknown', metadata = {} }) {
  const config = getEmailConfig();

  // Check EMAIL_ENABLED flag
  if (!config.enabled) {
    console.log(`[EmailService] Email disabled. Would send "${subject}" to ${to}`);
    await logEmail({
      to,
      subject,
      templateName,
      status: 'disabled',
      metadata,
    });
    return { success: false, reason: 'disabled' };
  }

  // Check rate limit
  if (!checkRateLimit()) {
    const rateLimitStatus = getRateLimitStatus();
    console.warn(`[EmailService] Rate limited. ${rateLimitStatus.sent}/${rateLimitStatus.limit} emails sent in window.`);
    await logEmail({
      to,
      subject,
      templateName,
      status: 'rate_limited',
      metadata,
    });
    return { success: false, reason: 'rate_limited', rateLimitStatus };
  }

  // If SMTP is not configured, log to console (graceful degradation)
  if (!isSmtpReady()) {
    // Try to initialize once more (env vars might have been set after startup)
    initTransporter();

    if (!isSmtpReady()) {
      console.log(`[EmailService] [CONSOLE MODE] To: ${to} | Subject: ${subject}`);
      console.log(`[EmailService] [CONSOLE MODE] Template: ${templateName}`);
      await logEmail({
        to,
        subject,
        templateName,
        status: 'logged',
        metadata,
      });
      return { success: true, mode: 'console' };
    }
  }

  // Send via SMTP
  const mailOptions = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    html,
    text: text || htmlToPlainText(html),
  };

  try {
    const result = await sendWithRetry(mailOptions);

    console.log(`[EmailService] Email sent: ${to} | ${subject} | messageId: ${result.messageId}`);
    await logEmail({
      to,
      subject,
      templateName,
      status: 'sent',
      messageId: result.messageId,
      metadata,
    });

    return { success: true, mode: 'smtp', messageId: result.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send email: ${to} | ${subject} |`, error.message);
    await logEmail({
      to,
      subject,
      templateName,
      status: 'failed',
      error: error.message,
      metadata,
    });

    return { success: false, reason: 'send_failed', error: error.message };
  }
}

/**
 * Strip HTML tags for plain text fallback.
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  - ')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Get the email service status (for health checks / admin dashboard).
 */
function getServiceStatus() {
  const config = getEmailConfig();
  const rateLimit = getRateLimitStatus();

  return {
    enabled: config.enabled,
    smtpConfigured: !!(config.smtpHost && config.smtpUser && config.smtpPass),
    smtpReady: isSmtpReady(),
    smtpHost: config.smtpHost ? `${config.smtpHost}:${config.smtpPort}` : null,
    fromEmail: config.fromEmail,
    rateLimit,
  };
}

/**
 * Verify SMTP connection (for admin health check).
 * @returns {Promise<Object>}
 */
async function verifyConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return { connected: false, reason: 'SMTP not configured' };
  }

  try {
    await transporter.verify();
    return { connected: true };
  } catch (error) {
    return { connected: false, reason: error.message };
  }
}

// ================ FOR TESTING ================ //

/**
 * Reset internal state (for testing only).
 */
function _resetForTesting() {
  _transporter = null;
  _transporterReady = false;
  _rateLimitWindow.length = 0;
}

/**
 * Set a custom transporter (for testing only).
 */
function _setTransporterForTesting(transporter) {
  _transporter = transporter;
  _transporterReady = transporter !== null;
}

module.exports = {
  sendEmail,
  getServiceStatus,
  verifyConnection,
  getEmailLog,
  getRateLimitStatus,
  htmlToPlainText,
  isSmtpReady,
  initTransporter,
  // Testing helpers
  _resetForTesting,
  _setTransporterForTesting,
};
