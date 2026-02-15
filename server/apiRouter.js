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
  csrfProtection,
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
const checkDepositStatus = require('./api/check-deposit-status');
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
const adminDeposits = require('./api/admin/deposits');
const adminCorporateDeposits = require('./api/admin/corporate-deposits');
const adminInstitutions = require('./api/admin/institutions');
const adminContent = require('./api/admin/content');
const adminUpload = require('./api/admin/upload');
const adminBlog = require('./api/admin/blog');
const adminCoachingConfig = require('./api/admin/coaching-config');
const adminStudentCoachingAccess = require('./api/admin/student-coaching-access');
const studentWaitlist = require('./api/admin/student-waitlist');

// File upload middleware
const fileUpload = require('express-fileupload');

// Project Workspace (secure portal for accepted students)
const projectWorkspace = require('./api/project-workspace');

// MFA (Multi-Factor Authentication) stubs
const mfa = require('./api/mfa');

// SSO/SAML stubs
const sso = require('./api/sso');

// Student Performance Assessments
const assessments = require('./api/assessments');

// Notification Center
const notifications = require('./api/notifications');

// Message Attachments
const messageAttachments = require('./api/message-attachments');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

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

// SECURITY: CSRF protection for state-mutating JSON requests.
// Exempt: Transit (SDK) requests (authenticated via SDK tokens, not cookies),
// OAuth callbacks from external providers, and external webhooks.
router.use((req, res, next) => {
  // Skip GET, HEAD, OPTIONS — csrfProtection already does this, but short-circuit here
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  // Skip Transit (Sharetribe SDK) requests — they use SDK session tokens, not browser cookies
  if (req.get('Content-Type') === 'application/transit+json') {
    return next();
  }
  // Skip OAuth callbacks and external webhooks
  const csrfExemptPaths = ['/auth/facebook/callback', '/auth/google/callback', '/auth/create-user-with-idp'];
  if (csrfExemptPaths.some(p => req.path === p)) {
    return next();
  }
  return csrfProtection(req, res, next);
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

// ProveGround: User search and invitation endpoints
router.get('/search-users', searchUsers);
router.post('/invite-to-apply', inviteToApply);

// ProveGround: Company/Corporate partner listings (for student search)
router.get('/company/:authorId/listings', companyListings);

// ProveGround: Company spending stats (for students, education admins, system admins)
router.get('/company/:companyId/spending', companySpending);
router.get('/companies/spending-report', companySpending.allCompanies);

// ProveGround: User statistics (projects completed, pending, etc.)
router.get('/user-stats/:userId', userStats);

// ProveGround: Deposit status check (for corporate partners)
router.get('/check-deposit-status/:transactionId', checkDepositStatus);

// ProveGround: Educational Admin endpoints
router.get('/education/dashboard', educationDashboard);
router.get('/education/students/:studentId/transactions', educationStudentTransactions);
router.post('/education/messages', educationMessages.send);
router.get('/education/messages', educationMessages.list);

// ProveGround: Educational Admin Application (public endpoint)
router.post('/educational-admin/apply', standardRateLimit, educationalAdminApplication.submit);

// ProveGround: Educational Admin Application Management (system admin only)
router.get('/admin/educational-admin-applications', educationalAdminApplication.list);
router.get('/admin/educational-admin-applications/stats', educationalAdminApplication.stats);
router.post('/admin/educational-admin-applications/:id/approve', educationalAdminApplication.approve);
router.post('/admin/educational-admin-applications/:id/reject', educationalAdminApplication.reject);

// ProveGround: Educational Admin Management (system admin only)
router.get('/admin/educational-admins', educationalAdminApplication.listEducationalAdmins);
router.put('/admin/educational-admins/:userId/subscription', educationalAdminApplication.updateSubscription);

// ProveGround: Enhanced Corporate Dashboard
router.get('/corporate/dashboard-stats', corporateDashboardStats);
router.get('/corporate/applications', corporateApplications);
router.get('/corporate/export/:type', corporateExport);
router.get('/corporate/invites', corporateInvites.listInvites);
router.get('/corporate/invites/:inviteId', corporateInvites.getInviteDetails);

// ProveGround: System Admin endpoints
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

// ProveGround: Deposit management endpoints (offline payment tracking)
router.get('/admin/deposits', adminDeposits.list);
router.get('/admin/deposits/:transactionId', adminDeposits.status);
router.post('/admin/deposits/:transactionId/confirm', adminDeposits.confirm);
router.post('/admin/deposits/:transactionId/revoke', adminDeposits.revoke);

// ProveGround: Corporate Partner Deposit Management (track by partner and project)
router.get('/admin/corporate-deposits', adminCorporateDeposits.list);
router.get('/admin/corporate-deposits/:partnerId', adminCorporateDeposits.getPartner);
router.post('/admin/corporate-deposits/:transactionId/clear-hold', adminCorporateDeposits.clearHold);
router.post('/admin/corporate-deposits/:transactionId/reinstate-hold', adminCorporateDeposits.reinstateHold);
router.post('/admin/corporate-deposits/:partnerId/clear-all-holds', adminCorporateDeposits.clearAllHolds);

// ProveGround: Institution membership management
router.get('/admin/institutions', adminInstitutions.list);
router.get('/admin/institutions/:domain', adminInstitutions.get);
router.post('/admin/institutions', adminInstitutions.createOrUpdate);
router.post('/admin/institutions/:domain/status', adminInstitutions.updateStatus);
router.post('/admin/institutions/:domain/coaching', adminInstitutions.updateCoaching);
router.delete('/admin/institutions/:domain', adminInstitutions.delete);

// Public institution check (for signup and students)
router.get('/institutions/check/:domain', adminInstitutions.checkMembership);
router.get('/institutions/my-institution', adminInstitutions.getMyInstitution);

// ProveGround: Content Management System (CMS) endpoints
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

// ProveGround: Blog Management System (Admin endpoints)
router.get('/admin/blog/posts', adminBlog.listPosts);
router.get('/admin/blog/posts/:postId', adminBlog.getPost);
router.post('/admin/blog/posts', adminBlog.createPost);
router.put('/admin/blog/posts/:postId', adminBlog.updatePost);
router.delete('/admin/blog/posts/:postId', adminBlog.deletePost);
router.get('/admin/blog/categories', adminBlog.listCategories);
router.post('/admin/blog/categories', adminBlog.addCategory);
router.delete('/admin/blog/categories/:category', adminBlog.deleteCategory);
router.put('/admin/blog/settings', adminBlog.updateSettings);

// ProveGround: Blog Public endpoints
router.get('/blog/posts', adminBlog.listPublicPosts);
router.get('/blog/posts/:slug', adminBlog.getPublicPost);

// ProveGround: AI Coaching Configuration
router.get('/admin/coaching-config', adminCoachingConfig.getConfig);
router.put('/admin/coaching-config', adminCoachingConfig.updateConfig);
router.get('/coaching-config/public', adminCoachingConfig.getPublicConfig);

// ProveGround: Student AI Coaching Access Management
router.get('/admin/student-coaching-access', adminStudentCoachingAccess.listBlocked);
router.post('/admin/student-coaching-access/block', adminStudentCoachingAccess.block);
router.post('/admin/student-coaching-access/unblock', adminStudentCoachingAccess.unblock);
router.get('/admin/student-coaching-access/check/:userId', adminStudentCoachingAccess.checkAccess);
router.get('/admin/institutions-coaching-summary', adminStudentCoachingAccess.getInstitutionsSummary);
router.get('/admin/institution/:domain/students', adminStudentCoachingAccess.getInstitutionStudents);

// ProveGround: Student Waitlist Management
router.post('/student-waitlist', studentWaitlist.addToWaitlist);
router.get('/admin/student-waitlist', studentWaitlist.listWaitlist);
router.put('/admin/student-waitlist/:entryId', studentWaitlist.updateWaitlistEntry);
router.delete('/admin/student-waitlist/:entryId', studentWaitlist.deleteWaitlistEntry);

// ProveGround: File upload endpoints for admin
router.post('/admin/upload/logo', adminUpload.uploadLogo);
router.post('/admin/upload/favicon', adminUpload.uploadFavicon);
router.post('/admin/upload/hero-image', adminUpload.uploadHeroImage);
router.post('/admin/upload/hero-video', adminUpload.uploadHeroVideo);
router.delete('/admin/upload/:filename', adminUpload.deleteFile);

// ProveGround: Secure Project Workspace (for accepted students with confirmed deposits)
router.get('/project-workspace/:transactionId', projectWorkspace.get);
router.post('/project-workspace/:transactionId/messages', projectWorkspace.sendMessage);
router.post('/project-workspace/:transactionId/mark-read', projectWorkspace.markRead);

// ProveGround: Multi-Factor Authentication (MFA) — stub endpoints
router.get('/mfa/status', mfa.getStatus);
router.post('/mfa/enroll', mfa.enroll);
router.post('/mfa/verify', mfa.verify);
router.post('/mfa/disable', mfa.disable);

// ProveGround: SSO/SAML Enterprise Identity Provider — stub endpoints
router.get('/sso/config', sso.getConfig);
router.get('/sso/initiate/:provider', sso.initiate);
router.post('/sso/callback', sso.callback);
router.get('/sso/metadata', sso.metadata);

// ProveGround: Student Performance Assessments
router.get('/assessments/criteria', assessments.getAssessmentCriteria);
router.post('/assessments', assessments.submitAssessment);
router.get('/assessments/pending', assessments.getPendingAssessments);
router.get('/assessments/transaction/:transactionId', assessments.getAssessmentByTransaction);
router.get('/assessments/student/:studentId', assessments.getStudentAssessments);

// ProveGround: Notification Center
router.get('/notifications', notifications.list);
router.get('/notifications/unread-count', notifications.unreadCount);
router.post('/notifications/:notificationId/read', notifications.markRead);
router.post('/notifications/read-all', notifications.markAllRead);

// ProveGround: Message Attachments
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
