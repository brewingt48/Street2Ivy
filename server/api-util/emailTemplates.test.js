/**
 * Tests for emailTemplates.js
 *
 * Verifies all email template functions produce correct output shape,
 * contain expected content, and render valid HTML structure.
 */

const {
  alumniInvitation,
  alumniWelcome,
  alumniReminder,
  tenantRequestReceived,
  tenantApproved,
  tenantRejected,
  getTemplateNames,
  renderTemplate,
  baseLayout,
  escapeHtml,
} = require('./emailTemplates');

// ================ HELPERS ================ //

/**
 * Assert that a result has the standard template shape:
 * { subject: string, html: string, templateName: string }
 */
function expectTemplateShape(result, expectedTemplateName) {
  expect(result).toHaveProperty('subject');
  expect(result).toHaveProperty('html');
  expect(result).toHaveProperty('templateName');
  expect(typeof result.subject).toBe('string');
  expect(typeof result.html).toBe('string');
  expect(typeof result.templateName).toBe('string');
  expect(result.templateName).toBe(expectedTemplateName);
}

/**
 * Assert that an HTML string contains the basic document structure
 * expected of a full email template.
 */
function expectValidHtmlStructure(html) {
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('<html');
  expect(html).toContain('<head>');
  expect(html).toContain('</head>');
  expect(html).toContain('<body>');
  expect(html).toContain('</body>');
  expect(html).toContain('</html>');
}

// ================ SETUP ================ //

describe('emailTemplates', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = 'https://test.street2ivy.com';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ================ alumniInvitation ================ //

  describe('alumniInvitation', () => {
    const baseData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      institutionName: 'Harvard University',
      invitationCode: 'abc123',
      graduationYear: '2020',
      program: 'Computer Science',
      invitedByName: 'Dr. Smith',
    };

    it('includes firstName, invitation link, and institution name in HTML', () => {
      const result = alumniInvitation(baseData);

      expectTemplateShape(result, 'alumniInvitation');
      expectValidHtmlStructure(result.html);

      // firstName appears in greeting
      expect(result.html).toContain('Jane');
      // Invitation link built from base URL + invitation code
      expect(result.html).toContain('https://test.street2ivy.com/alumni/join/abc123');
      // Institution name appears in body
      expect(result.html).toContain('Harvard University');
      // Subject contains institution name
      expect(result.subject).toContain('Harvard University');
    });

    it('includes branding colors in HTML when branding is provided', () => {
      const data = {
        ...baseData,
        branding: {
          marketplaceColor: '#ff5500',
          marketplaceName: 'Harvard Network',
          logoUrl: 'https://example.com/logo.png',
        },
      };
      const result = alumniInvitation(data);

      expectTemplateShape(result, 'alumniInvitation');
      expectValidHtmlStructure(result.html);

      // Branding color is used in header background and CTA button
      expect(result.html).toContain('#ff5500');
      // Branding marketplace name appears in header
      expect(result.html).toContain('Harvard Network');
      // Logo URL is included
      expect(result.html).toContain('https://example.com/logo.png');
    });
  });

  // ================ alumniWelcome ================ //

  describe('alumniWelcome', () => {
    const baseData = {
      firstName: 'Carlos',
      lastName: 'Ruiz',
      institutionName: 'MIT',
    };

    it('includes firstName and dashboard link', () => {
      const result = alumniWelcome(baseData);

      expectTemplateShape(result, 'alumniWelcome');
      expectValidHtmlStructure(result.html);

      // firstName in greeting and subject
      expect(result.html).toContain('Carlos');
      expect(result.subject).toContain('Carlos');
      // Dashboard link
      expect(result.html).toContain('https://test.street2ivy.com/alumni/dashboard');
      // Institution name in body
      expect(result.html).toContain('MIT');
    });
  });

  // ================ alumniReminder ================ //

  describe('alumniReminder', () => {
    const baseData = {
      firstName: 'Priya',
      email: 'priya@example.com',
      institutionName: 'Stanford University',
      invitationCode: 'reminder456',
    };

    it('includes firstName and new invitation link', () => {
      const result = alumniReminder(baseData);

      expectTemplateShape(result, 'alumniReminder');
      expectValidHtmlStructure(result.html);

      // firstName in greeting
      expect(result.html).toContain('Priya');
      // New invitation link with updated code
      expect(result.html).toContain('https://test.street2ivy.com/alumni/join/reminder456');
      // Institution name in body and subject
      expect(result.html).toContain('Stanford University');
      expect(result.subject).toContain('Stanford University');
    });
  });

  // ================ tenantRequestReceived ================ //

  describe('tenantRequestReceived', () => {
    const baseData = {
      adminName: 'Dr. Sarah Chen',
      adminEmail: 'sarah.chen@university.edu',
      institutionName: 'Yale University',
      requestId: 'req-789',
    };

    it('includes adminName and requestId', () => {
      const result = tenantRequestReceived(baseData);

      expectTemplateShape(result, 'tenantRequestReceived');
      expectValidHtmlStructure(result.html);

      // Admin name in greeting
      expect(result.html).toContain('Dr. Sarah Chen');
      // Request ID in info box
      expect(result.html).toContain('req-789');
      // Institution name in body and subject
      expect(result.html).toContain('Yale University');
      expect(result.subject).toContain('Yale University');
    });
  });

  // ================ tenantApproved ================ //

  describe('tenantApproved', () => {
    const baseData = {
      adminName: 'Dr. Sarah Chen',
      adminEmail: 'sarah.chen@university.edu',
      institutionName: 'Yale University',
      tenantId: 'tenant-001',
    };

    it('includes tenantId and dashboard link', () => {
      const result = tenantApproved(baseData);

      expectTemplateShape(result, 'tenantApproved');
      expectValidHtmlStructure(result.html);

      // Tenant ID in info box
      expect(result.html).toContain('tenant-001');
      // Dashboard link
      expect(result.html).toContain('https://test.street2ivy.com/education/dashboard');
      // Admin name in greeting
      expect(result.html).toContain('Dr. Sarah Chen');
      // Institution name in subject
      expect(result.subject).toContain('Yale University');
    });
  });

  // ================ tenantRejected ================ //

  describe('tenantRejected', () => {
    const baseData = {
      adminName: 'Dr. Sarah Chen',
      adminEmail: 'sarah.chen@university.edu',
      institutionName: 'Yale University',
    };

    it('includes rejectionReason when provided', () => {
      const data = {
        ...baseData,
        rejectionReason: 'Incomplete documentation provided.',
      };
      const result = tenantRejected(data);

      expectTemplateShape(result, 'tenantRejected');
      expectValidHtmlStructure(result.html);

      // Rejection reason in info box
      expect(result.html).toContain('Incomplete documentation provided.');
      // Admin name in greeting
      expect(result.html).toContain('Dr. Sarah Chen');
      // Institution name in subject and body
      expect(result.subject).toContain('Yale University');
      expect(result.html).toContain('Yale University');
    });

    it('works without rejectionReason', () => {
      const result = tenantRejected(baseData);

      expectTemplateShape(result, 'tenantRejected');
      expectValidHtmlStructure(result.html);

      // Should not contain an info-box with a reason since none was provided
      expect(result.html).not.toContain('<strong>Reason:</strong>');
      // Admin name still present
      expect(result.html).toContain('Dr. Sarah Chen');
      // Institution name still present
      expect(result.subject).toContain('Yale University');
    });
  });

  // ================ getTemplateNames ================ //

  describe('getTemplateNames', () => {
    it('returns all 6 template names', () => {
      const names = getTemplateNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names).toHaveLength(6);
      expect(names).toContain('alumniInvitation');
      expect(names).toContain('alumniWelcome');
      expect(names).toContain('alumniReminder');
      expect(names).toContain('tenantRequestReceived');
      expect(names).toContain('tenantApproved');
      expect(names).toContain('tenantRejected');
    });
  });

  // ================ renderTemplate ================ //

  describe('renderTemplate', () => {
    it('renders a known template successfully', () => {
      const data = {
        firstName: 'Alex',
        lastName: 'Johnson',
        email: 'alex@example.com',
        institutionName: 'Princeton',
        invitationCode: 'render-test-001',
      };
      const result = renderTemplate('alumniInvitation', data);

      expectTemplateShape(result, 'alumniInvitation');
      expectValidHtmlStructure(result.html);

      // Verify it actually rendered with provided data
      expect(result.html).toContain('Alex');
      expect(result.html).toContain('Princeton');
      expect(result.html).toContain('render-test-001');
    });

    it('throws for an unknown template', () => {
      expect(() => {
        renderTemplate('nonExistentTemplate', {});
      }).toThrow('Unknown email template: "nonExistentTemplate"');
    });
  });

  // ================ escapeHtml ================ //

  describe('escapeHtml', () => {
    it('escapes &, <, >, ", and \'', () => {
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#39;');

      // All entities in one string
      const input = '<script>alert("xss" & \'attack\')</script>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;attack&#39;)&lt;/script&gt;'
      );

      // Falsy values return empty string
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  // ================ baseLayout ================ //

  describe('baseLayout', () => {
    it('includes branding color, marketplace name, and logo when provided', () => {
      const html = baseLayout({
        title: 'Test Email',
        bodyContent: '<p>Hello world</p>',
        branding: {
          marketplaceColor: '#e63946',
          marketplaceName: 'Columbia Connect',
          logoUrl: 'https://cdn.example.com/columbia-logo.png',
        },
      });

      expectValidHtmlStructure(html);

      // Branding color used in header background and CTA styles
      expect(html).toContain('#e63946');
      // Marketplace name in header and footer
      expect(html).toContain('Columbia Connect');
      // Logo image tag present with URL
      expect(html).toContain('https://cdn.example.com/columbia-logo.png');
      // Body content rendered
      expect(html).toContain('<p>Hello world</p>');
      // Title in <title> tag
      expect(html).toContain('<title>Test Email</title>');
    });

    it('works with empty branding (uses defaults)', () => {
      const html = baseLayout({
        title: 'Default Test',
        bodyContent: '<p>Default content</p>',
        branding: {},
      });

      expectValidHtmlStructure(html);

      // Default color
      expect(html).toContain('#1c7881');
      // Default marketplace name
      expect(html).toContain('Street2Ivy');
      // Body content still rendered
      expect(html).toContain('<p>Default content</p>');
      // No logo image tag (logoUrl is null by default)
      // The header should not contain an <img> tag since no logo was provided
      const headerMatch = html.match(/<div class="email-header">([\s\S]*?)<\/div>/);
      expect(headerMatch).not.toBeNull();
      expect(headerMatch[1]).not.toContain('<img');
    });
  });
});
