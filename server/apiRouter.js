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

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const deleteAccount = require('./api/delete-account');
const searchUsers = require('./api/search-users');
const inviteToApply = require('./api/invite-to-apply');
const checkDepositStatus = require('./api/check-deposit-status');

// Educational Admin endpoints
const educationDashboard = require('./api/education-dashboard');
const educationStudentTransactions = require('./api/education-student-transactions');

// Corporate Dashboard enhanced stats
const corporateDashboardStats = require('./api/corporate-dashboard-stats');

// System Admin endpoints
const adminUsers = require('./api/admin/users');
const adminMessages = require('./api/admin/messages');
const adminReports = require('./api/admin/reports');
const adminExportReport = require('./api/admin/export-report');
const adminDeposits = require('./api/admin/deposits');
const adminInstitutions = require('./api/admin/institutions');

// Project Workspace (secure portal for accepted students)
const projectWorkspace = require('./api/project-workspace');

// NDA E-Signature
const ndaSignature = require('./api/nda-signature');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

const router = express.Router();

// ================ API router middleware: ================ //

// Parse JSON bodies (for custom API endpoints like search-users)
router.use(bodyParser.json());

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

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', transitionPrivileged);
router.post('/delete-account', deleteAccount);

// Street2Ivy: User search and invitation endpoints
router.get('/search-users', searchUsers);
router.post('/invite-to-apply', inviteToApply);

// Street2Ivy: Deposit status check (for corporate partners)
router.get('/check-deposit-status/:transactionId', checkDepositStatus);

// Street2Ivy: Educational Admin endpoints
router.get('/education/dashboard', educationDashboard);
router.get('/education/students/:studentId/transactions', educationStudentTransactions);

// Street2Ivy: Enhanced Corporate Dashboard
router.get('/corporate/dashboard-stats', corporateDashboardStats);

// Street2Ivy: System Admin endpoints
router.get('/admin/users', adminUsers.list);
router.get('/admin/users/pending', adminUsers.pending);
router.get('/admin/users/:userId', adminUsers.get);
router.post('/admin/users/:userId/block', adminUsers.block);
router.post('/admin/users/:userId/unblock', adminUsers.unblock);
router.post('/admin/users/:userId/approve', adminUsers.approve);
router.post('/admin/users/:userId/reject', adminUsers.reject);
router.delete('/admin/users/:userId', adminUsers.delete);
router.post('/admin/messages', adminMessages.send);
router.get('/admin/messages', adminMessages.list);
router.post('/admin/messages/:messageId/read', adminMessages.markAsRead);
router.get('/admin/messages/unread-count', adminMessages.getUnreadCount);
router.get('/admin/reports/:type', adminReports);
router.get('/admin/export/:type', adminExportReport);

// Street2Ivy: Deposit management endpoints (offline payment tracking)
router.get('/admin/deposits', adminDeposits.list);
router.get('/admin/deposits/:transactionId', adminDeposits.status);
router.post('/admin/deposits/:transactionId/confirm', adminDeposits.confirm);
router.post('/admin/deposits/:transactionId/revoke', adminDeposits.revoke);

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

// Street2Ivy: Secure Project Workspace (for accepted students with confirmed deposits)
router.get('/project-workspace/:transactionId', projectWorkspace.get);
router.post('/project-workspace/:transactionId/messages', projectWorkspace.sendMessage);
router.post('/project-workspace/:transactionId/accept-nda', projectWorkspace.acceptNda);
router.post('/project-workspace/:transactionId/mark-read', projectWorkspace.markRead);

// Street2Ivy: NDA E-Signature endpoints
router.post('/nda/upload', ndaSignature.uploadDocument);
router.get('/nda/:listingId', ndaSignature.getDocument);
router.post('/nda/request-signature/:transactionId', ndaSignature.requestSignature);
router.get('/nda/signature-status/:transactionId', ndaSignature.getSignatureStatus);
router.post('/nda/sign/:transactionId', ndaSignature.sign);
router.get('/nda/download/:transactionId', ndaSignature.download);
router.post('/nda/webhook', ndaSignature.webhook);

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
