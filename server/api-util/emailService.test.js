/**
 * Tests for the Email Service
 *
 * Covers graceful degradation, SMTP sending, rate limiting,
 * retry logic, HTML-to-text conversion, and service status.
 */

// ---- Mocks ---- //

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn(),
  })),
}));

jest.mock('./jsonStore', () => {
  let mockData = {};
  return {
    readJSON: jest.fn((filepath, defaultValue = []) => {
      return mockData[filepath] || defaultValue;
    }),
    atomicWriteJSON: jest.fn(async (filepath, data) => {
      mockData[filepath] = data;
      return true;
    }),
    _setMockData: (filepath, data) => { mockData[filepath] = data; },
    _clearMockData: () => { mockData = {}; },
  };
});

// Require modules AFTER mocks are set up
const nodemailer = require('nodemailer');
const { readJSON, atomicWriteJSON, _clearMockData } = require('./jsonStore');
const {
  sendEmail,
  getServiceStatus,
  verifyConnection,
  getEmailLog,
  getRateLimitStatus,
  htmlToPlainText,
  isSmtpReady,
  initTransporter,
  _resetForTesting,
  _setTransporterForTesting,
} = require('./emailService');

const path = require('path');
const EMAIL_LOG_FILE = path.join(__dirname, '../data/email-log.json');

// ---- Helpers ---- //

/** Save and restore process.env across tests */
let savedEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  // Clear email-related env vars
  delete process.env.EMAIL_ENABLED;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_SECURE;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM_NAME;
  delete process.env.EMAIL_RATE_LIMIT;
  delete process.env.EMAIL_MAX_RETRIES;

  _resetForTesting();
  _clearMockData();
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = savedEnv;
});

// ---- Test Suite ---- //

describe('EmailService', () => {
  // ============================================================
  // 1. Graceful degradation: sendEmail works with no SMTP configured
  // ============================================================
  describe('graceful degradation (no SMTP configured)', () => {
    it('returns { success: true, mode: "console" } when SMTP is not configured', async () => {
      // No SMTP env vars set — should degrade to console mode
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
        templateName: 'test-template',
      });

      expect(result).toEqual({ success: true, mode: 'console' });
    });
  });

  // ============================================================
  // 2. EMAIL_ENABLED=false: sendEmail returns disabled
  // ============================================================
  describe('EMAIL_ENABLED=false', () => {
    it('returns { success: false, reason: "disabled" } when email is disabled', async () => {
      process.env.EMAIL_ENABLED = 'false';

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      });

      expect(result).toEqual({ success: false, reason: 'disabled' });
    });
  });

  // ============================================================
  // 3. Rate limiting: exceeding limit returns rate_limited
  // ============================================================
  describe('rate limiting', () => {
    it('returns { success: false, reason: "rate_limited" } when rate limit is exceeded', async () => {
      process.env.EMAIL_RATE_LIMIT = '2';

      // Send two emails to fill the rate limit window
      await sendEmail({ to: 'a@test.com', subject: 'A', html: '<p>A</p>' });
      await sendEmail({ to: 'b@test.com', subject: 'B', html: '<p>B</p>' });

      // Third email should be rate limited
      const result = await sendEmail({ to: 'c@test.com', subject: 'C', html: '<p>C</p>' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('rate_limited');
      expect(result.rateLimitStatus).toBeDefined();
    });
  });

  // ============================================================
  // 4. Successful SMTP send: returns { success: true, mode: 'smtp' }
  // ============================================================
  describe('successful SMTP send', () => {
    it('returns { success: true, mode: "smtp" } with messageId', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: '<msg-001@smtp.test>' }),
        verify: jest.fn().mockResolvedValue(true),
      };
      _setTransporterForTesting(mockTransporter);

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Welcome aboard!</p>',
        templateName: 'welcome',
      });

      expect(result).toEqual({
        success: true,
        mode: 'smtp',
        messageId: '<msg-001@smtp.test>',
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Welcome',
          html: '<p>Welcome aboard!</p>',
        })
      );
    });
  });

  // ============================================================
  // 5. Failed SMTP send: returns { success: false, reason: 'send_failed' }
  // ============================================================
  describe('failed SMTP send', () => {
    it('returns { success: false, reason: "send_failed" } on non-retryable error', async () => {
      const permanentError = new Error('550 Mailbox not found');
      permanentError.responseCode = 550;

      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(permanentError),
        verify: jest.fn(),
      };
      _setTransporterForTesting(mockTransporter);

      // Set maxRetries to 0 so we don't retry on this permanent error
      process.env.EMAIL_MAX_RETRIES = '0';

      const result = await sendEmail({
        to: 'invalid@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('send_failed');
      expect(result.error).toContain('550 Mailbox not found');
    });
  });

  // ============================================================
  // 6. Retry on ECONNREFUSED: retries and eventually succeeds
  // ============================================================
  describe('retry on transient error', () => {
    it('retries on ECONNREFUSED and succeeds on subsequent attempt', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:587');
      connError.code = 'ECONNREFUSED';

      const mockTransporter = {
        sendMail: jest.fn()
          .mockRejectedValueOnce(connError)
          .mockResolvedValueOnce({ messageId: '<retry-success@smtp.test>' }),
        verify: jest.fn(),
      };
      _setTransporterForTesting(mockTransporter);

      // Set short retry delays and allow retries
      process.env.EMAIL_MAX_RETRIES = '2';

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Retry Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('smtp');
      expect(result.messageId).toBe('<retry-success@smtp.test>');
      // Should have been called twice: first attempt fails, second succeeds
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  // ============================================================
  // 7. No retry on permanent error (non-retryable): fails immediately
  // ============================================================
  describe('no retry on permanent error', () => {
    it('does not retry on non-retryable 5xx error', async () => {
      const permanentError = new Error('553 Authentication required');
      permanentError.responseCode = 553;

      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(permanentError),
        verify: jest.fn(),
      };
      _setTransporterForTesting(mockTransporter);

      process.env.EMAIL_MAX_RETRIES = '2';

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Permanent Fail',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('send_failed');
      // Should only be called once — no retries for permanent errors
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 8. htmlToPlainText: converts HTML to plain text correctly
  // ============================================================
  describe('htmlToPlainText', () => {
    it('strips HTML tags and converts block elements to newlines', () => {
      const html = '<h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p>';
      const result = htmlToPlainText(html);

      expect(result).toContain('Title');
      expect(result).toContain('First paragraph.');
      expect(result).toContain('Second paragraph.');
      // Should not contain any HTML tags
      expect(result).not.toMatch(/<[^>]+>/);
    });

    // ============================================================
    // 9. htmlToPlainText: handles links
    // ============================================================
    it('converts anchor tags to "text (url)" format', () => {
      const html = '<a href="https://example.com">Click here</a>';
      const result = htmlToPlainText(html);

      expect(result).toBe('Click here (https://example.com)');
    });
  });

  // ============================================================
  // 10. getServiceStatus: returns correct shape
  // ============================================================
  describe('getServiceStatus', () => {
    it('returns the expected status shape with all required fields', () => {
      const status = getServiceStatus();

      expect(status).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          smtpConfigured: expect.any(Boolean),
          smtpReady: expect.any(Boolean),
          fromEmail: expect.any(String),
          rateLimit: expect.objectContaining({
            sent: expect.any(Number),
            limit: expect.any(Number),
            remaining: expect.any(Number),
            resetMs: expect.any(Number),
          }),
        })
      );
    });
  });

  // ============================================================
  // 11. getRateLimitStatus: returns correct shape
  // ============================================================
  describe('getRateLimitStatus', () => {
    it('returns the expected rate limit shape with correct initial values', () => {
      const status = getRateLimitStatus();

      expect(status).toEqual({
        sent: 0,
        limit: 50,
        remaining: 50,
        resetMs: 0,
      });
    });
  });

  // ============================================================
  // 12. verifyConnection: returns connected when transporter works
  // ============================================================
  describe('verifyConnection', () => {
    it('returns { connected: true } when transporter.verify() succeeds', async () => {
      const mockTransporter = {
        sendMail: jest.fn(),
        verify: jest.fn().mockResolvedValue(true),
      };
      _setTransporterForTesting(mockTransporter);

      const result = await verifyConnection();

      expect(result).toEqual({ connected: true });
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    // ============================================================
    // 13. verifyConnection: returns not connected when no transporter
    // ============================================================
    it('returns { connected: false } when no transporter is available', async () => {
      // _resetForTesting already cleared the transporter, and no SMTP env vars are set
      const result = await verifyConnection();

      expect(result.connected).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  // ============================================================
  // 14. getEmailLog: reads from jsonStore
  // ============================================================
  describe('getEmailLog', () => {
    it('reads log entries from jsonStore and returns newest first', () => {
      const mockLog = [
        { id: 'email_1', to: 'a@test.com', subject: 'First', status: 'sent', timestamp: '2025-01-01T00:00:00.000Z' },
        { id: 'email_2', to: 'b@test.com', subject: 'Second', status: 'failed', timestamp: '2025-01-02T00:00:00.000Z' },
        { id: 'email_3', to: 'c@test.com', subject: 'Third', status: 'sent', timestamp: '2025-01-03T00:00:00.000Z' },
      ];
      readJSON.mockReturnValueOnce(mockLog);

      const result = getEmailLog({ limit: 10 });

      expect(readJSON).toHaveBeenCalledWith(EMAIL_LOG_FILE, []);
      expect(result).toHaveLength(3);
      // Newest first
      expect(result[0].id).toBe('email_3');
      expect(result[2].id).toBe('email_1');
    });

    it('filters log entries by status', () => {
      const mockLog = [
        { id: 'email_1', status: 'sent', timestamp: '2025-01-01T00:00:00.000Z' },
        { id: 'email_2', status: 'failed', timestamp: '2025-01-02T00:00:00.000Z' },
        { id: 'email_3', status: 'sent', timestamp: '2025-01-03T00:00:00.000Z' },
      ];
      readJSON.mockReturnValueOnce(mockLog);

      const result = getEmailLog({ status: 'sent' });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.status === 'sent')).toBe(true);
    });
  });

  // ============================================================
  // 15. Logs email attempts to jsonStore
  // ============================================================
  describe('email logging', () => {
    it('logs email attempt to jsonStore after sending', async () => {
      // No SMTP configured — will use console mode, but should still log
      const result = await sendEmail({
        to: 'logged@example.com',
        subject: 'Log Test',
        html: '<p>Logged</p>',
        templateName: 'log-test',
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('console');

      // atomicWriteJSON should have been called with the log file
      expect(atomicWriteJSON).toHaveBeenCalledWith(
        EMAIL_LOG_FILE,
        expect.arrayContaining([
          expect.objectContaining({
            to: 'logged@example.com',
            subject: 'Log Test',
            templateName: 'log-test',
            status: 'logged',
            timestamp: expect.any(String),
          }),
        ])
      );
    });
  });
});
