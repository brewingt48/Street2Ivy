/**
 * Admin Email API — Endpoint Tests
 * Stage 6: Email Notification Service
 *
 * Tests all email management handlers:
 * - getStatus (service status + available templates)
 * - verifySmtp (SMTP connection verification)
 * - previewTemplate (render template with sample data)
 * - sendTestEmail (send test email with [TEST] prefix)
 * - getLog (email log viewer)
 *
 * All endpoints require system admin auth (verifySystemAdmin).
 */

// ---------------------------------------------------------------------------
// Mocks — registered before require('./email') so imports resolve correctly
// ---------------------------------------------------------------------------

jest.mock('../../api-util/security', () => ({
  verifySystemAdmin: jest.fn(),
}));

jest.mock('../../api-util/emailService', () => ({
  sendEmail: jest.fn(),
  getServiceStatus: jest.fn(),
  verifyConnection: jest.fn(),
  getEmailLog: jest.fn(),
  getRateLimitStatus: jest.fn(),
}));

jest.mock('../../api-util/emailTemplates', () => ({
  getTemplateNames: jest.fn(),
  renderTemplate: jest.fn(),
}));

const {
  createMockReq,
  createMockRes,
  createMockSystemAdmin,
} = require('../../test-utils/mockHelpers');

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

const email = require('./email');

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Admin Email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // getStatus
  // =========================================================================
  describe('getStatus', () => {
    it('should reject non-admin users with 403', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();

      await email.getStatus(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });

    it('should return service status and available templates', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      getServiceStatus.mockReturnValue({
        mode: 'live',
        configured: true,
        healthy: true,
      });
      getRateLimitStatus.mockReturnValue({
        remaining: 95,
        limit: 100,
        windowMs: 3600000,
      });
      getTemplateNames.mockReturnValue([
        'alumniInvitation',
        'alumniWelcome',
        'alumniReminder',
      ]);

      const req = createMockReq();
      const res = createMockRes();

      await email.getStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();

      const data = res._json.data;
      expect(data.mode).toBe('live');
      expect(data.configured).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.rateLimit).toEqual({
        remaining: 95,
        limit: 100,
        windowMs: 3600000,
      });
      expect(data.availableTemplates).toEqual([
        'alumniInvitation',
        'alumniWelcome',
        'alumniReminder',
      ]);

      expect(getServiceStatus).toHaveBeenCalledTimes(1);
      expect(getRateLimitStatus).toHaveBeenCalledTimes(1);
      expect(getTemplateNames).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // verifySmtp
  // =========================================================================
  describe('verifySmtp', () => {
    it('should reject non-admin users with 403', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();

      await email.verifySmtp(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });

    it('should return SMTP connection verification result', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      verifyConnection.mockResolvedValue({
        success: true,
        message: 'SMTP connection verified successfully',
      });

      const req = createMockReq();
      const res = createMockRes();

      await email.verifySmtp(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();
      expect(res._json.data.success).toBe(true);
      expect(res._json.data.message).toMatch(/verified successfully/i);
      expect(verifyConnection).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // previewTemplate
  // =========================================================================
  describe('previewTemplate', () => {
    it('should reject non-admin users with 403', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq({ params: { templateName: 'alumniInvitation' } });
      const res = createMockRes();

      await email.previewTemplate(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });

    it('should render template with sample data and return JSON', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      getTemplateNames.mockReturnValue(['alumniInvitation', 'alumniWelcome']);
      renderTemplate.mockReturnValue({
        templateName: 'alumniInvitation',
        subject: 'You are invited to join Harvard x Street2Ivy',
        html: '<html><body>Welcome Jane!</body></html>',
      });

      const req = createMockReq({
        params: { templateName: 'alumniInvitation' },
        query: {},
      });
      const res = createMockRes();

      await email.previewTemplate(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();

      const data = res._json.data;
      expect(data.templateName).toBe('alumniInvitation');
      expect(data.subject).toBe('You are invited to join Harvard x Street2Ivy');
      expect(data.html).toContain('Welcome Jane!');
      expect(data.sampleData).toBeDefined();
      expect(data.sampleData.firstName).toBe('Jane');

      expect(renderTemplate).toHaveBeenCalledWith('alumniInvitation', expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        institutionName: 'Harvard University',
      }));
    });

    it('should return 404 for unknown template name', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      getTemplateNames.mockReturnValue(['alumniInvitation', 'alumniWelcome']);

      const req = createMockReq({
        params: { templateName: 'nonExistentTemplate' },
        query: {},
      });
      const res = createMockRes();

      await email.previewTemplate(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/unknown template/i);
      expect(res._json.error).toContain('nonExistentTemplate');
      expect(renderTemplate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // sendTestEmail
  // =========================================================================
  describe('sendTestEmail', () => {
    it('should reject non-admin users with 403', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq({
        body: {
          templateName: 'alumniInvitation',
          to: 'test@example.com',
        },
      });
      const res = createMockRes();

      await email.sendTestEmail(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });

    it('should send test email with [TEST] subject prefix', async () => {
      const mockAdmin = createMockSystemAdmin();
      verifySystemAdmin.mockResolvedValue(mockAdmin);
      renderTemplate.mockReturnValue({
        templateName: 'alumniInvitation',
        subject: 'You are invited to join Harvard x Street2Ivy',
        html: '<html><body>Welcome Jane!</body></html>',
      });
      sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-abc-123',
      });

      const req = createMockReq({
        body: {
          templateName: 'alumniInvitation',
          to: 'admin@example.com',
        },
      });
      const res = createMockRes();

      await email.sendTestEmail(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();
      expect(res._json.data.success).toBe(true);
      expect(res._json.data.messageId).toBe('msg-abc-123');

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const sendArgs = sendEmail.mock.calls[0][0];
      expect(sendArgs.to).toBe('admin@example.com');
      expect(sendArgs.subject).toBe('[TEST] You are invited to join Harvard x Street2Ivy');
      expect(sendArgs.html).toContain('Welcome Jane!');
      expect(sendArgs.templateName).toBe('test_alumniInvitation');
      expect(sendArgs.metadata.isTest).toBe(true);
      expect(sendArgs.metadata.sentBy).toBe('admin-uuid-001');
    });

    it('should return 400 when templateName is missing', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());

      const req = createMockReq({
        body: {
          to: 'admin@example.com',
        },
      });
      const res = createMockRes();

      await email.sendTestEmail(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/templateName.*required/i);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getLog
  // =========================================================================
  describe('getLog', () => {
    it('should reject non-admin users with 403', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();

      await email.getLog(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });

    it('should return email log entries', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());

      const mockLogEntries = [
        {
          id: 'log-001',
          templateName: 'alumniInvitation',
          to: 'jane@example.com',
          status: 'sent',
          timestamp: '2025-01-15T10:00:00.000Z',
        },
        {
          id: 'log-002',
          templateName: 'alumniWelcome',
          to: 'bob@example.com',
          status: 'sent',
          timestamp: '2025-01-15T11:00:00.000Z',
        },
      ];
      getEmailLog.mockReturnValue(mockLogEntries);

      const req = createMockReq({ query: { limit: '10', status: 'sent' } });
      const res = createMockRes();

      await email.getLog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();
      expect(res._json.data).toHaveLength(2);
      expect(res._json.data[0].id).toBe('log-001');
      expect(res._json.data[1].templateName).toBe('alumniWelcome');
      expect(res._json.total).toBe(2);

      expect(getEmailLog).toHaveBeenCalledWith({
        limit: 10,
        status: 'sent',
        templateName: undefined,
      });
    });
  });
});
