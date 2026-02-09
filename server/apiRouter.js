/**
 * This file contains server side endpoints that can be used to perform backend
 * tasks that can not be handled in the browser.
 *
 * The endpoints should not clash with the application routes. Therefore, the
 * endpoints are prefixed in the main server where this file is used.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');
const {
  standardRateLimit,
  strictRateLimit,
  securityHeaders,
  responseSanitizer,
  getCSRFToken,
  getAuditLogs,
  validatePassword,
  SECURITY_CONFIG,
} = require('./api-util/security');

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const transactionTransition = require('./api/transaction-transition');
const deleteAccount = require('./api/delete-account');
const searchUsers = require('./api/search-users');
const inviteToApply = require('./api/invite-to-apply');
const companyListings = require('./api/company-listings');
const companySpending = require('./api/company-spending');
const userStats = require('./api/user-stats');

// Educational Admin endpoints
const educationDashboard = require('./api/education-dashboard');
const educationStudentTransactions = require('./api/education-student-transactions');
const educationalAdminApplication = require('./api/educational-admin-application');
const educationMessages = require('./api/education-messages');

// Corporate Dashboard enhanced stats
const corporateDashboardStats = require('./api/corporate-dashboard-stats');
const corporateApplications = require('./api/corporate-applications');
const corporateExport = require('./api/corporate-export');
const corporateInvites = require('./api/corporate-invites');

// System Admin endpoints
const adminUsers = require('./api/admin/users');
const adminMessages = require('./api/admin/messages');
const adminReports = require('./api/admin/reports');
const adminExportReport = require('./api/admin/export-report');
const adminInstitutions = require('./api/admin/institutions');
const adminContent = require('./api/admin/content');
const adminUpload = require('./api/admin/upload');
const adminBlog = require('./api/admin/blog');
const adminCoachingConfig = require('./api/admin/coaching-config');
const adminStudentCoachingAccess = require('./api/admin/student-coaching-access');
const studentWaitlist = require('./api/admin/student-waitlist');

// Multi-tenant management
const adminTenants = require('./api/admin/tenants');

// Email management (system admin)
const adminEmail = require('./api/admin/email');

// Education tenant management (edu-admin scoped)
const educationTenant = require('./api/education-tenant');

// Alumni management (edu-admin scoped)
const educationAlumni = require('./api/education-alumni');

// Education students and reports (edu-admin scoped)
const educationStudents = require('./api/education-students');
const educationReports = require('./api/education-reports');

// Alumni dashboard (alumni user)
const alumniDashboard = require('./api/alumni-dashboard');

// Alumni referrals (alumni user)
const alumniReferrals = require('./api/alumni-referrals');

// File upload middleware
const fileUpload = require('express-fileupload');

// Student Performance Assessments
const assessments = require('./api/assessments');

// Notification Center
const notifications = require('./api/notifications');

// Message Attachments
const messageAttachments = require('./api/message-attachments');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

// ================ Startup JSON validation ================ //
const { validateJSONFile } = require('./api-util/jsonStore');
const pathForValidation = require('path');

const dataDir = pathForValidation.join(__dirname, 'data');
const jsonFilesToValidate = [
  { file: pathForValidation.join(dataDir, 'tenants.json'), type: 'array' },
  { file: pathForValidation.join(dataDir, 'alumni.json'), type: 'array' },
  { file: pathForValidation.join(dataDir, 'tenant-requests.json'), type: 'array' },
  { file: pathForValidation.join(dataDir, 'email-log.json'), type: 'array' },
  { file: pathForValidation.join(dataDir, 'referrals.json'), type: 'array' },
];

jsonFilesToValidate.forEach(({ file, type }) => {
  const result = validateJSONFile(file, type);
  if (!result.valid) {
    console.warn(`[apiRouter] Data file warning: ${pathForValidation.basename(file)} — ${result.error}`);
  }
});

const router = express.Router();

// ================ API router middleware: ================ //

// SECURITY: Add security headers to all API responses
router.use(securityHeaders);

// SECURITY: Apply standard rate limiting to all API endpoints
router.use(standardRateLimit);

// SECURITY: Sanitize API responses to remove sensitive data
router.use(responseSanitizer);

// Parse JSON bodies (for custom API endpoints like search-users)
router.use(bodyParser.json({ limit: '1mb' })); // SECURITY: Limit body size

// File upload middleware for admin uploads
router.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
  })
);

// Serve uploaded files through the API router for proper CORS handling
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
router.use('/uploads', express.static(uploadsDir));

// Parse Transit body first to a string
router.use(
  bodyParser.text({
    type: 'application/transit+json',
  })
);

// Deserialize Transit body string to JS data
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' && typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse request body as Transit:');
      console.error(e);
      res.status(400).send('Invalid Transit in request body.');
      return;
    }
  }
  next();
});

// ================ API router endpoints: ================ //

// SECURITY: CSRF token endpoint
router.get('/csrf-token', getCSRFToken);

// SECURITY: Password validation endpoint
router.post('/validate-password', (req, res) => {
  const { password } = req.body;
  const result = validatePassword(password);
  res.json(result);
});

// SECURITY: Security configuration endpoint (public, read-only)
router.get('/security-config', (req, res) => {
  res.json({
    passwordMinLength: SECURITY_CONFIG.passwordMinLength,
    passwordRequireUppercase: SECURITY_CONFIG.passwordRequireUppercase,
    passwordRequireLowercase: SECURITY_CONFIG.passwordRequireLowercase,
    passwordRequireNumber: SECURITY_CONFIG.passwordRequireNumber,
    passwordRequireSpecial: SECURITY_CONFIG.passwordRequireSpecial,
    maxFileSize: SECURITY_CONFIG.maxFileSize,
    allowedMimeTypes: SECURITY_CONFIG.allowedMimeTypes,
    allowedExtensions: SECURITY_CONFIG.allowedExtensions,
  });
});

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', transitionPrivileged);
router.post('/transaction-transition', transactionTransition);
router.post('/delete-account', strictRateLimit, deleteAccount); // SECURITY: strict rate limit

// Street2Ivy: User search and invitation endpoints
router.get('/search-users', searchUsers);
router.post('/invite-to-apply', inviteToApply);

// Street2Ivy: Company/Corporate partner listings (for student search)
router.get('/company/:authorId/listings', companyListings);

// Street2Ivy: Company spending stats (for students, education admins, system admins)
router.get('/company/:companyId/spending', companySpending);
router.get('/companies/spending-report', companySpending.allCompanies);

// Street2Ivy: User statistics (projects completed, pending, etc.)
router.get('/user-stats/:userId', userStats);

// Street2Ivy: Educational Admin endpoints
router.get('/education/dashboard', educationDashboard);
router.get('/education/students/:studentId/transactions', educationStudentTransactions);
router.post('/education/messages', educationMessages.send);
router.get('/education/messages', educationMessages.list);

// Street2Ivy: Educational Admin Application (public endpoint)
router.post('/educational-admin/apply', standardRateLimit, educationalAdminApplication.submit);

// Street2Ivy: Educational Admin Application Management (system admin only)
router.get('/admin/educational-admin-applications', educationalAdminApplication.list);
router.get('/admin/educational-admin-applications/stats', educationalAdminApplication.stats);
router.post('/admin/educational-admin-applications/:id/approve', educationalAdminApplication.approve);
router.post('/admin/educational-admin-applications/:id/reject', educationalAdminApplication.reject);

// Street2Ivy: Educational Admin Management (system admin only)
router.get('/admin/educational-admins', educationalAdminApplication.listEducationalAdmins);
router.put('/admin/educational-admins/:userId/subscription', educationalAdminApplication.updateSubscription);

// Street2Ivy: Enhanced Corporate Dashboard
router.get('/corporate/dashboard-stats', corporateDashboardStats);
router.get('/corporate/applications', corporateApplications);
router.get('/corporate/export/:type', corporateExport);
router.get('/corporate/invites', corporateInvites.listInvites);
router.get('/corporate/invites/:inviteId', corporateInvites.getInviteDetails);

// Street2Ivy: System Admin endpoints
router.get('/admin/users', adminUsers.list);
router.get('/admin/users/pending', adminUsers.pending);
router.post('/admin/users/create-admin', strictRateLimit, adminUsers.createAdmin); // Create admin accounts - SECURITY: strict rate limit
router.get('/admin/users/:userId', adminUsers.get);
router.post('/admin/users/:userId/block', strictRateLimit, adminUsers.block); // SECURITY: strict rate limit
router.post('/admin/users/:userId/unblock', strictRateLimit, adminUsers.unblock); // SECURITY: strict rate limit
router.post('/admin/users/:userId/approve', adminUsers.approve);
router.post('/admin/users/:userId/reject', adminUsers.reject);
router.delete('/admin/users/:userId', strictRateLimit, adminUsers.delete); // SECURITY: strict rate limit
router.post('/admin/messages', adminMessages.send);
router.get('/admin/messages', adminMessages.list);
router.post('/admin/messages/:messageId/read', adminMessages.markAsRead);
router.get('/admin/messages/unread-count', adminMessages.getUnreadCount);
router.get('/admin/reports/:type', adminReports);
router.get('/admin/export/:type', adminExportReport);

// SECURITY: Admin audit logs endpoint
router.get('/admin/audit-logs', async (req, res) => {
  const { verifySystemAdmin } = require('./api-util/security');
  const admin = await verifySystemAdmin(req, res);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { eventType, userId, startDate, endDate, limit, offset } = req.query;
  const logs = getAuditLogs({
    eventType,
    userId,
    startDate,
    endDate,
    limit: parseInt(limit, 10) || 100,
    offset: parseInt(offset, 10) || 0,
  });
  res.json(logs);
});

// Street2Ivy: Institution membership management
router.get('/admin/institutions', adminInstitutions.list);
router.get('/admin/institutions/:domain', adminInstitutions.get);
router.post('/admin/institutions', adminInstitutions.createOrUpdate);
router.post('/admin/institutions/:domain/status', adminInstitutions.updateStatus);
router.post('/admin/institutions/:domain/coaching', adminInstitutions.updateCoaching);
router.delete('/admin/institutions/:domain', adminInstitutions.delete);

// Public institution check (for signup and students)
router.get('/institutions/check/:domain', adminInstitutions.checkMembership);
router.get('/institutions/my-institution', adminInstitutions.getMyInstitution);

// Street2Ivy: Education Tenant Management (edu-admin scoped)
router.get('/education/tenant', educationTenant.getMyTenant);
router.put('/education/tenant/branding', educationTenant.updateBranding);
router.put('/education/tenant/settings', educationTenant.updateSettings);
router.post('/education/tenant/activate', educationTenant.activateTenant);
router.post('/education/tenant-request', educationTenant.submitTenantRequest);

// Street2Ivy: Alumni Management (edu-admin scoped)
router.post('/education/alumni/invite', educationAlumni.invite);
router.get('/education/alumni', educationAlumni.list);

// Street2Ivy: Alumni Invitation Verification/Acceptance
// IMPORTANT: Specific paths BEFORE parameterized :id routes to avoid conflicts
router.get('/education/alumni/verify-invitation/:code', educationAlumni.verifyInvitation);
router.post('/education/alumni/accept-invitation', educationAlumni.acceptInvitation);
router.delete('/education/alumni/:id', educationAlumni.delete);
router.put('/education/alumni/:id/resend', educationAlumni.resend);

// Street2Ivy: Education Students (edu-admin scoped)
router.get('/education/students', educationStudents.list);
router.get('/education/students/stats', educationStudents.stats);

// Street2Ivy: Education Reports (edu-admin scoped)
router.get('/education/reports/overview', educationReports.overview);
router.get('/education/reports/export', educationReports.export);

// Street2Ivy: Education Tenant logo upload
router.post('/education/tenant/logo', educationTenant.uploadLogo);

// Street2Ivy: Alumni Dashboard (alumni user)
router.get('/alumni/dashboard', alumniDashboard);

// Street2Ivy: Alumni Referrals (alumni user)
router.get('/alumni/referral-link', alumniReferrals.getReferralLink);
router.get('/alumni/referrals', alumniReferrals.listReferrals);
router.post('/alumni/referrals/track', alumniReferrals.trackReferral);
router.get('/alumni/referrals/stats', alumniReferrals.getReferralStats);

// Street2Ivy: Tenant Requests Management (system admin only)
router.get('/admin/tenant-requests', educationTenant.listTenantRequests);
router.post('/admin/tenant-requests/:id/approve', educationTenant.approveTenantRequest);
router.post('/admin/tenant-requests/:id/reject', educationTenant.rejectTenantRequest);

// Street2Ivy: Multi-tenant management (system admin only)
router.get('/admin/tenants', adminTenants.list);
router.get('/admin/tenants/:tenantId', adminTenants.get);
router.post('/admin/tenants', adminTenants.create);
router.put('/admin/tenants/:tenantId', adminTenants.update);
router.delete('/admin/tenants/:tenantId', strictRateLimit, adminTenants.delete); // SECURITY: strict rate limit
router.put('/admin/tenants/:tenantId/branding', adminTenants.updateBranding);

// Public tenant resolution (called on page load to detect which tenant to use)
router.get('/tenants/resolve', adminTenants.resolve);

// Tenant lookup by institution domain (system admin or edu admin)
router.get('/tenants/by-institution/:domain', adminTenants.getByInstitutionDomain);

// Street2Ivy: Email Management (system admin only)
router.get('/admin/email/status', adminEmail.getStatus);
router.post('/admin/email/verify', adminEmail.verifySmtp);
router.get('/admin/email/preview/:templateName', adminEmail.previewTemplate);
router.post('/admin/email/test', strictRateLimit, adminEmail.sendTestEmail); // SECURITY: strict rate limit
router.get('/admin/email/log', adminEmail.getLog);

// Street2Ivy: Content Management System (CMS) endpoints
router.get('/admin/content', adminContent.getContent);
router.get('/admin/content/:section', adminContent.getSection);
router.put('/admin/content/:section', adminContent.updateSection);
router.post('/admin/content/:section/items', adminContent.addItem);
router.put('/admin/content/:section/items/:itemId', adminContent.updateItem);
router.delete('/admin/content/:section/items/:itemId', adminContent.deleteItem);
router.post('/admin/content/reset', adminContent.resetContent);

// Public content endpoint (for frontend to fetch landing page content)
router.get('/content', adminContent.getPublicContent);

// Public legal pages endpoints
router.get('/legal', adminContent.getLegalPagesList);
router.get('/legal/:pageType', adminContent.getLegalPage);

// Street2Ivy: Blog Management System (Admin endpoints)
router.get('/admin/blog/posts', adminBlog.listPosts);
router.get('/admin/blog/posts/:postId', adminBlog.getPost);
router.post('/admin/blog/posts', adminBlog.createPost);
router.put('/admin/blog/posts/:postId', adminBlog.updatePost);
router.delete('/admin/blog/posts/:postId', adminBlog.deletePost);
router.get('/admin/blog/categories', adminBlog.listCategories);
router.post('/admin/blog/categories', adminBlog.addCategory);
router.delete('/admin/blog/categories/:category', adminBlog.deleteCategory);
router.put('/admin/blog/settings', adminBlog.updateSettings);

// Street2Ivy: Blog Public endpoints
router.get('/blog/posts', adminBlog.listPublicPosts);
router.get('/blog/posts/:slug', adminBlog.getPublicPost);

// Street2Ivy: AI Coaching Configuration
router.get('/admin/coaching-config', adminCoachingConfig.getConfig);
router.put('/admin/coaching-config', adminCoachingConfig.updateConfig);
router.get('/coaching-config/public', adminCoachingConfig.getPublicConfig);

// Street2Ivy: Student AI Coaching Access Management
router.get('/admin/student-coaching-access', adminStudentCoachingAccess.listBlocked);
router.post('/admin/student-coaching-access/block', adminStudentCoachingAccess.block);
router.post('/admin/student-coaching-access/unblock', adminStudentCoachingAccess.unblock);
router.get('/admin/student-coaching-access/check/:userId', adminStudentCoachingAccess.checkAccess);
router.get('/admin/institutions-coaching-summary', adminStudentCoachingAccess.getInstitutionsSummary);
router.get('/admin/institution/:domain/students', adminStudentCoachingAccess.getInstitutionStudents);

// Street2Ivy: Student Waitlist Management
router.post('/student-waitlist', studentWaitlist.addToWaitlist);
router.get('/admin/student-waitlist', studentWaitlist.listWaitlist);
router.put('/admin/student-waitlist/:entryId', studentWaitlist.updateWaitlistEntry);
router.delete('/admin/student-waitlist/:entryId', studentWaitlist.deleteWaitlistEntry);

// Street2Ivy: File upload endpoints for admin
router.post('/admin/upload/logo', adminUpload.uploadLogo);
router.post('/admin/upload/favicon', adminUpload.uploadFavicon);
router.post('/admin/upload/hero-image', adminUpload.uploadHeroImage);
router.post('/admin/upload/hero-video', adminUpload.uploadHeroVideo);
router.delete('/admin/upload/:filename', adminUpload.deleteFile);

// Street2Ivy: Student Performance Assessments
router.get('/assessments/criteria', assessments.getAssessmentCriteria);
router.post('/assessments', assessments.submitAssessment);
router.get('/assessments/pending', assessments.getPendingAssessments);
router.get('/assessments/transaction/:transactionId', assessments.getAssessmentByTransaction);
router.get('/assessments/student/:studentId', assessments.getStudentAssessments);

// Street2Ivy: Notification Center
router.get('/notifications', notifications.list);
router.get('/notifications/unread-count', notifications.unreadCount);
router.post('/notifications/:notificationId/read', notifications.markRead);
router.post('/notifications/read-all', notifications.markAllRead);

// Street2Ivy: Message Attachments
router.post('/attachments/upload', messageAttachments.uploadAttachment);
router.get('/attachments', messageAttachments.getAttachments);
router.get('/attachments/:id', messageAttachments.getAttachmentInfo);
router.get('/attachments/:id/download', messageAttachments.downloadAttachment);
router.get('/attachments/:id/preview', messageAttachments.previewAttachment);
router.delete('/attachments/:id', messageAttachments.deleteAttachment);

// Create user with identity provider (e.g. Facebook or Google)
// This endpoint is called to create a new user after user has confirmed
// they want to continue with the data fetched from IdP (e.g. name and email)
router.post('/auth/create-user-with-idp', createUserWithIdp);

// Facebook authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Facebook
router.get('/auth/facebook', authenticateFacebook);

// This is the route for callback URL the user is redirected after authenticating
// with Facebook. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/facebook/callback', authenticateFacebookCallback);

// Google authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Google
router.get('/auth/google', authenticateGoogle);

// This is the route for callback URL the user is redirected after authenticating
// with Google. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/google/callback', authenticateGoogleCallback);

module.exports = router;
