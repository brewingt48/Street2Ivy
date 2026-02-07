// These helpers are calling this template's own server-side routes
// so, they are not directly calling Marketplace API or Integration API.
// You can find these api endpoints from 'server/api/...' directory

import appSettings from '../config/settings';
import { types as sdkTypes, transit } from './sdkLoader';
import Decimal from 'decimal.js';

export const apiBaseUrl = marketplaceRootURL => {
  const port = process.env.REACT_APP_DEV_API_SERVER_PORT;
  const useDevApiServer = process.env.NODE_ENV === 'development' && !!port;

  // In development, the dev API server is running in a different port
  if (useDevApiServer) {
    return `http://localhost:${port}`;
  }

  // Otherwise, use the given marketplaceRootURL parameter or the same domain and port as the frontend
  return marketplaceRootURL ? marketplaceRootURL.replace(/\/$/, '') : `${window.location.origin}`;
};

// Application type handlers for JS SDK.
//
// NOTE: keep in sync with `typeHandlers` in `server/api-util/sdk.js`
export const typeHandlers = [
  // Use Decimal type instead of SDK's BigDecimal.
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal,
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

const serialize = data => {
  return transit.write(data, { typeHandlers, verbose: appSettings.sdk.transitVerbose });
};

const deserialize = str => {
  return transit.read(str, { typeHandlers });
};

const methods = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// If server/api returns data from SDK, you should set Content-Type to 'application/transit+json'
const request = (path, options = {}) => {
  const url = `${apiBaseUrl()}${path}`;
  const { credentials, headers, body, ...rest } = options;

  // Determine if we should serialize the body as transit format
  // If headers specify 'application/json', don't serialize - just pass the body as-is
  const isJsonContentType = headers && headers['Content-Type'] === 'application/json';
  const shouldSerializeBody =
    (!headers || headers['Content-Type'] === 'application/transit+json') && body;

  // Build body option - either serialize for transit or pass through for JSON
  let bodyMaybe = {};
  if (body) {
    bodyMaybe = shouldSerializeBody ? { body: serialize(body) } : { body };
  }

  const fetchOptions = {
    credentials: credentials || 'include',
    // Since server/api mostly talks to Marketplace API using SDK,
    // we default to 'application/transit+json' as content type (as SDK uses transit).
    headers: headers || { 'Content-Type': 'application/transit+json' },
    ...bodyMaybe,
    ...rest,
  };

  return window.fetch(url, fetchOptions).then(res => {
    const contentTypeHeader = res.headers.get('Content-Type');
    const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;

    if (res.status >= 400) {
      return res.json().then(data => {
        let e = new Error();
        e = Object.assign(e, data);

        throw e;
      });
    }
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize);
    } else if (contentType === 'application/json') {
      return res.json();
    }
    return res.text();
  });
};

// Keep the previous parameter order for the post method.
// For now, only POST has own specific function, but you can create more or use request directly.
const post = (path, body, options = {}) => {
  const requestOptions = {
    ...options,
    method: methods.POST,
    body,
  };

  return request(path, requestOptions);
};

// Fetch transaction line items from the local API endpoint.
//
// See `server/api/transaction-line-items.js` to see what data should
// be sent in the body.
export const transactionLineItems = body => {
  return post('/api/transaction-line-items', body);
};

// Initiate a privileged transaction.
//
// With privileged transitions, the transactions need to be created
// from the backend. This endpoint enables sending the order data to
// the local backend, and passing that to the Marketplace API.
//
// See `server/api/initiate-privileged.js` to see what data should be
// sent in the body.
export const initiatePrivileged = body => {
  return post('/api/initiate-privileged', body);
};

// Transition a transaction with a privileged transition.
//
// This is similar to the `initiatePrivileged` above. It will use the
// backend for the transition. The backend endpoint will add the
// payment line items to the transition params.
//
// See `server/api/transition-privileged.js` to see what data should
// be sent in the body.
export const transitionPrivileged = body => {
  return post('/api/transition-privileged', body);
};

// Simple transaction transition.
//
// For non-privileged transitions (like accept/decline in project applications),
// this endpoint performs a simple SDK transition without line item calculation.
//
// See `server/api/transaction-transition.js` for implementation details.
export const transitionTransaction = body => {
  return post('/api/transaction-transition', body);
};

// Create user with identity provider (e.g. Facebook or Google)
//
// If loginWithIdp api call fails and user can't authenticate to Marketplace API with idp
// we will show option to create a new user with idp.
// For that user needs to confirm data fetched from the idp.
// After the confirmation, this endpoint is called to create a new user with confirmed data.
//
// See `server/api/auth/createUserWithIdp.js` to see what data should
// be sent in the body.
export const createUserWithIdp = body => {
  return post('/api/auth/create-user-with-idp', body);
};

// Check if user can be deleted and then delete the user. Endpoint logic
// must be modified to accommodate the transaction processes used in
// the marketplace.
export const deleteUserAccount = body => {
  return post('/api/delete-account', body);
};

// Street2Ivy: Search users via Integration API
//
// Queries users by extended data fields (userType, state, skills, etc.)
// This calls a server-side endpoint that uses the Integration API SDK
// since the Marketplace API doesn't support users.query().
//
// See `server/api/search-users.js` for supported query parameters.
export const searchUsers = params => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/search-users?${queryString}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Street2Ivy: Invite a student to apply for a project
//
// Corporate partners can invite students to apply for their project listings.
// This uses the trusted SDK on the server to initiate a transaction
// on behalf of the student (since only the customer can initiate transactions).
//
// See `server/api/invite-to-apply.js` for implementation details.
export const inviteToApply = body => {
  return post('/api/invite-to-apply', body);
};

// Street2Ivy: Fetch company listings (open projects)
//
// Fetch published listings for a corporate partner (by author ID)
// Used on the search companies page to show a company's open projects.
//
// See `server/api/company-listings.js` for implementation details.
export const fetchCompanyListings = (authorId, params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/company/${authorId}/listings${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Street2Ivy: Fetch user statistics (projects completed, pending, etc.)
//
// Fetch project statistics for a user (student or corporate partner)
// Used on search pages to show project stats alongside user info.
//
// See `server/api/user-stats.js` for implementation details.
export const fetchUserStats = userId => {
  return request(`/api/user-stats/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Street2Ivy: Fetch company spending statistics
//
// Fetch spending statistics for a specific corporate partner.
// Accessible by students, educational admins, and system admins.
// Shows how much a company has spent on projects.
//
// See `server/api/company-spending.js` for implementation details.
export const fetchCompanySpending = companyId => {
  return request(`/api/company/${companyId}/spending`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Street2Ivy: Fetch all companies spending report
//
// Fetch spending statistics for all corporate partners.
// Accessible by educational admins and system admins only.
//
// See `server/api/company-spending.js` for implementation details.
export const fetchAllCompaniesSpending = () => {
  return request(`/api/companies/spending-report`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================
// Street2Ivy: Educational Admin Dashboard APIs
// =====================================================

// Fetch educational admin dashboard stats and student list
export const fetchEducationDashboard = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/education/dashboard${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch transaction history for a specific student (for educational admins)
export const fetchStudentTransactions = (studentId, params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(
    `/api/education/students/${studentId}/transactions${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

// Send message from educational admin to students or system admin
export const sendEducationalAdminMessage = data => {
  return request('/api/education/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Fetch messages sent by educational admin
export const fetchEducationalAdminMessages = () => {
  return request('/api/education/messages', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================
// Street2Ivy: Enhanced Corporate Dashboard APIs
// =====================================================

// Fetch enhanced corporate dashboard statistics
export const fetchCorporateDashboardStats = () => {
  return request('/api/corporate/dashboard-stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch sent invitations for corporate partner
export const fetchCorporateInvites = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/api/corporate/invites?${queryString}` : '/api/corporate/invites';
  return request(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch details of a specific invite
export const fetchCorporateInviteDetails = (inviteId) => {
  return request(`/api/corporate/invites/${inviteId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================
// Street2Ivy: Student Performance Assessments
// =====================================================

// Fetch assessment criteria configuration
export const fetchAssessmentCriteria = () => {
  return request('/api/assessments/criteria', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Submit a student performance assessment
export const submitAssessment = body => {
  return post('/api/assessments', body);
};

// Fetch pending assessments for corporate partner
export const fetchPendingAssessments = () => {
  return request('/api/assessments/pending', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch assessment for a specific transaction
export const fetchAssessmentByTransaction = transactionId => {
  return request(`/api/assessments/transaction/${transactionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch all assessments for a student
export const fetchStudentAssessments = studentId => {
  return request(`/api/assessments/student/${studentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================
// Street2Ivy: System Admin APIs
// =====================================================

// Fetch list of all users (admin only)
export const fetchAdminUsers = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/admin/users${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get detailed info about a specific user (admin only)
export const fetchAdminUser = userId => {
  return request(`/api/admin/users/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Block a user (admin only)
export const blockUser = userId => {
  return request(`/api/admin/users/${userId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Unblock a user (admin only)
export const unblockUser = userId => {
  return request(`/api/admin/users/${userId}/unblock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Delete a user (admin only)
export const deleteUserAdmin = userId => {
  return request(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Create an admin user (system admin only)
export const createAdminUser = data => {
  return request('/api/admin/users/create-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Submit educational admin application
export const submitEducationalAdminApplication = data => {
  return request('/api/educational-admin/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// ========== Educational Admin Applications Management (System Admin) ==========

// Fetch all educational admin applications (system admin only)
export const fetchEducationalAdminApplications = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/admin/educational-admin-applications${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch educational admin application statistics (system admin only)
export const fetchEducationalAdminApplicationStats = () => {
  return request('/api/admin/educational-admin-applications/stats', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Approve an educational admin application (system admin only)
export const approveEducationalAdminApplication = applicationId => {
  return request(`/api/admin/educational-admin-applications/${applicationId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Reject an educational admin application (system admin only)
export const rejectEducationalAdminApplication = (applicationId, reason) => {
  return request(`/api/admin/educational-admin-applications/${applicationId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

// ========== Educational Admin Subscription Management (System Admin) ==========

// Update educational admin subscription status (deposit, AI coaching)
export const updateEducationalAdminSubscription = (userId, data) => {
  return request(`/api/admin/educational-admins/${userId}/subscription`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Fetch all educational administrators (system admin only)
export const fetchEducationalAdmins = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/admin/educational-admins${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Send admin message to educational admin
export const sendAdminMessage = body => {
  return request('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

// Fetch admin messages
export const fetchAdminMessages = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/admin/messages${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Mark admin message as read
export const markAdminMessageRead = messageId => {
  return request(`/api/admin/messages/${messageId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Get unread message count for educational admins
export const fetchUnreadMessageCount = () => {
  return request('/api/admin/messages/unread-count', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch admin reports
export const fetchAdminReports = type => {
  return request(`/api/admin/reports/${type}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch users pending approval (admin only)
export const fetchPendingApprovals = (params = {}) => {
  const queryString = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return request(`/api/admin/users/pending${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Approve a corporate partner or educational admin profile (admin only)
export const approveUserProfile = userId => {
  return request(`/api/admin/users/${userId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Reject a corporate partner or educational admin profile (admin only)
export const rejectUserProfile = (userId, reason) => {
  return request(`/api/admin/users/${userId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

// ========== Deposit Management (Admin) ==========

// Get list of transactions awaiting deposit confirmation (admin only)
export const fetchPendingDeposits = (params = {}) => {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return request(`/api/admin/deposits${queryString ? `?${queryString}` : ''}`);
};

// Confirm deposit received for a transaction (admin only)
export const confirmDeposit = (transactionId, { amount, paymentMethod, notes }) => {
  return request(`/api/admin/deposits/${transactionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, paymentMethod, notes }),
  });
};

// Revoke deposit confirmation (admin only)
export const revokeDeposit = (transactionId, reason) => {
  return request(`/api/admin/deposits/${transactionId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

// Get deposit status for a transaction (admin only)
export const getDepositStatus = transactionId => {
  return request(`/api/admin/deposits/${transactionId}`);
};

// ========== Corporate Partner Deposit Management (Admin) ==========

// Get list of corporate partners with their deposit status (admin only)
export const fetchCorporateDeposits = (params = {}) => {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return request(`/api/admin/corporate-deposits${queryString ? `?${queryString}` : ''}`);
};

// Get detailed deposits for a specific corporate partner (admin only)
export const fetchCorporatePartnerDeposits = partnerId => {
  return request(`/api/admin/corporate-deposits/${partnerId}`);
};

// Clear work hold for a transaction (admin only)
// Allows student to proceed with work on the project
export const clearWorkHold = (transactionId, notes = '') => {
  return request(`/api/admin/corporate-deposits/${transactionId}/clear-hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
};

// Reinstate work hold for a transaction (admin only)
// Blocks student from proceeding with work on the project
export const reinstateWorkHold = (transactionId, reason = '') => {
  return request(`/api/admin/corporate-deposits/${transactionId}/reinstate-hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

// Clear all work holds for a corporate partner (admin only)
// Bulk operation to allow all hired students to proceed
export const clearAllHoldsForPartner = (partnerId, notes = '') => {
  return request(`/api/admin/corporate-deposits/${partnerId}/clear-all-holds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
};

// ========== Deposit Status Check (Corporate Partners) ==========

// Check if deposit is confirmed for a transaction (for corporate partners)
export const checkDepositStatus = transactionId => {
  return request(`/api/check-deposit-status/${transactionId}`);
};

// ========== Project Workspace (Secure Portal) ==========

// Get project workspace data (for accepted students with confirmed deposits)
export const fetchProjectWorkspace = transactionId => {
  return request(`/api/project-workspace/${transactionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Send a secure message in the project workspace
// If attachments contain local files, upload them first
export const sendProjectMessage = async (transactionId, { content, attachments = [] }) => {
  // Upload any local attachments first
  const uploadedAttachments = [];

  for (const attachment of attachments) {
    if (attachment.isLocal && attachment.file) {
      // Upload the file
      const uploadResult = await uploadAttachment(attachment.file, 'workspace', transactionId);
      if (uploadResult.success && uploadResult.attachment) {
        uploadedAttachments.push({
          id: uploadResult.attachment.id,
          name: uploadResult.attachment.name,
          size: uploadResult.attachment.size,
          sizeFormatted: uploadResult.attachment.sizeFormatted,
          fileType: uploadResult.attachment.fileType,
          url: uploadResult.attachment.url,
          previewUrl: uploadResult.attachment.previewUrl,
        });
      }
    } else {
      // Already uploaded attachment
      uploadedAttachments.push(attachment);
    }
  }

  // Now send the message with uploaded attachment references
  return request(`/api/project-workspace/${transactionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, attachments: uploadedAttachments }),
  });
};

// Accept NDA for a project
export const acceptProjectNda = transactionId => {
  return request(`/api/project-workspace/${transactionId}/accept-nda`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Mark messages as read
export const markProjectMessagesRead = (transactionId, messageIds) => {
  return request(`/api/project-workspace/${transactionId}/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageIds }),
  });
};

// ========== Institution Membership Management ==========

// Check if a domain is a member institution (public - for signup validation)
export const checkInstitutionMembership = domain => {
  return request(`/api/institutions/check/${encodeURIComponent(domain)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get current student's institution info (AI coaching, membership status)
export const fetchMyInstitution = () => {
  return request('/api/institutions/my-institution', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Admin: List all institutions
export const fetchInstitutions = () => {
  return request('/api/admin/institutions', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Admin: Get institution by domain
export const fetchInstitution = domain => {
  return request(`/api/admin/institutions/${encodeURIComponent(domain)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Admin: Create or update institution
export const saveInstitution = institutionData => {
  return request('/api/admin/institutions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(institutionData),
  });
};

// Admin: Update institution membership status
export const updateInstitutionStatus = (domain, membershipStatus) => {
  return request(`/api/admin/institutions/${encodeURIComponent(domain)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipStatus }),
  });
};

// Admin: Update institution AI coaching settings
export const updateInstitutionCoaching = (domain, { aiCoachingEnabled, aiCoachingUrl }) => {
  return request(`/api/admin/institutions/${encodeURIComponent(domain)}/coaching`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiCoachingEnabled, aiCoachingUrl }),
  });
};

// Admin: Delete institution
export const deleteInstitution = domain => {
  return request(`/api/admin/institutions/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// ========== NDA E-Signature Management ==========

// Upload NDA document for a listing (corporate partners)
export const uploadNdaDocument = ({ listingId, documentUrl, documentName, ndaText }) => {
  return request('/api/nda/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, documentUrl, documentName, ndaText }),
  });
};

// Get NDA document info for a listing
export const getNdaDocument = listingId => {
  return request(`/api/nda/${listingId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Request signatures for NDA (creates signature request)
export const requestNdaSignature = transactionId => {
  return request(`/api/nda/request-signature/${transactionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
};

// Get NDA signature status for a transaction
export const getNdaSignatureStatus = transactionId => {
  return request(`/api/nda/signature-status/${transactionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Sign the NDA (for in-app signature)
export const signNda = (transactionId, { signatureData, agreedToTerms }) => {
  return request(`/api/nda/sign/${transactionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signatureData, agreedToTerms }),
  });
};

// Download signed NDA document
export const downloadSignedNda = transactionId => {
  return request(`/api/nda/download/${transactionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Export admin report to CSV or HTML format (admin only)
// format: 'csv' for Excel-compatible, 'html' for Word-compatible
export const exportAdminReport = (reportType, format = 'csv') => {
  const url = `${apiBaseUrl()}/api/admin/export/${reportType}?format=${format}`;

  // Use a download approach for file exports
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Export failed');
          });
        }
        return response.blob().then(blob => {
          // Get filename from Content-Disposition header
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `report.${format}`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }

          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);

          resolve({ success: true, filename });
        });
      })
      .catch(err => {
        reject(err);
      });
  });
};

// Export corporate report to CSV or HTML format (corporate partners only)
// format: 'csv' for Excel-compatible, 'html' for Word-compatible
export const exportCorporateReport = (reportType = 'summary', format = 'csv') => {
  const url = `${apiBaseUrl()}/api/corporate/export/${reportType}?format=${format}`;

  // Use a download approach for file exports
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error || 'Export failed');
          });
        }
        return response.blob().then(blob => {
          // Get filename from Content-Disposition header
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `corporate-report.${format}`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }

          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);

          resolve({ success: true, filename });
        });
      })
      .catch(err => {
        reject(err);
      });
  });
};

// ========== Content Management System (CMS) ==========

// Get all landing page content (admin)
export const fetchLandingContent = () => {
  return request('/api/admin/content', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get public landing page content (for frontend display)
export const fetchPublicContent = () => {
  return request('/api/content', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get list of active legal pages
export const fetchLegalPagesList = () => {
  return request('/api/legal', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get a specific legal page content
export const fetchLegalPage = pageType => {
  return request(`/api/legal/${pageType}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Get specific content section
export const fetchContentSection = section => {
  return request(`/api/admin/content/${section}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Update a content section
export const updateContentSection = (section, data) => {
  return request(`/api/admin/content/${section}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Add an item to a section (testimonials, features, etc.)
export const addContentItem = (section, item) => {
  return request(`/api/admin/content/${section}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
};

// Update an item in a section
export const updateContentItem = (section, itemId, data) => {
  return request(`/api/admin/content/${section}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Delete an item from a section
export const deleteContentItem = (section, itemId) => {
  return request(`/api/admin/content/${section}/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Reset content to defaults
export const resetLandingContent = () => {
  return request('/api/admin/content/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};

// ================ Blog API Functions ================ //

// Fetch blog posts (admin view)
export const fetchBlogPosts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/admin/blog/posts${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch a single blog post by ID (admin)
export const fetchBlogPost = (postId) => {
  return request(`/api/admin/blog/posts/${postId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Create a new blog post
export const createBlogPost = (postData) => {
  return request('/api/admin/blog/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData),
  });
};

// Update a blog post
export const updateBlogPost = (postId, postData) => {
  return request(`/api/admin/blog/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData),
  });
};

// Delete a blog post
export const deleteBlogPost = (postId) => {
  return request(`/api/admin/blog/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch blog categories
export const fetchBlogCategories = () => {
  return request('/api/admin/blog/categories', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Add a blog category
export const addBlogCategory = (category) => {
  return request('/api/admin/blog/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });
};

// Delete a blog category
export const deleteBlogCategory = (category) => {
  return request(`/api/admin/blog/categories/${encodeURIComponent(category)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Update blog settings
export const updateBlogSettings = (settings) => {
  return request('/api/admin/blog/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
};

// Fetch public blog posts
export const fetchPublicBlogPosts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/blog/posts${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Fetch public blog post by slug
export const fetchPublicBlogPost = (slug) => {
  return request(`/api/blog/posts/${slug}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// ================ AI Coaching Configuration API Functions ================ //

// Fetch AI coaching configuration (admin)
export const fetchCoachingConfig = () => {
  return request('/api/admin/coaching-config', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Update AI coaching configuration (admin)
export const updateCoachingConfig = (config) => {
  return request('/api/admin/coaching-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
};

// Fetch public coaching configuration
export const fetchPublicCoachingConfig = () => {
  return request('/api/coaching-config/public', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// ================ Student Waitlist API Functions ================ //

// Add student to waitlist (public)
export const addToStudentWaitlist = (data) => {
  return request('/api/student-waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Fetch student waitlist (admin)
export const fetchStudentWaitlist = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/api/admin/student-waitlist${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

// Update waitlist entry (admin)
export const updateWaitlistEntry = (entryId, data) => {
  return request(`/api/admin/student-waitlist/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Delete waitlist entry (admin)
export const deleteWaitlistEntry = (entryId) => {
  return request(`/api/admin/student-waitlist/${entryId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

// ─── Message Attachment Functions ───────────────────────────────────────────

/**
 * Upload a file attachment
 * @param {File} file - The file to upload
 * @param {string} contextType - The context type (e.g., 'transaction', 'workspace')
 * @param {string} contextId - The context ID (e.g., transaction ID)
 * @returns {Promise} - The upload response with attachment info
 */
export const uploadAttachment = (file, contextType, contextId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('contextType', contextType);
  formData.append('contextId', contextId);

  return window.fetch(`${apiBaseUrl()}/api/attachments/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Don't set Content-Type - let browser set it with boundary for multipart/form-data
  }).then(res => {
    if (res.status >= 400) {
      return res.json().then(data => {
        const e = new Error(data.error || 'Upload failed');
        e.data = data;
        throw e;
      });
    }
    return res.json();
  });
};

/**
 * Get attachments for a context
 * @param {string} contextType - The context type
 * @param {string} contextId - The context ID
 * @returns {Promise} - List of attachments
 */
export const getAttachments = (contextType, contextId) => {
  return request(`/api/attachments?contextType=${contextType}&contextId=${contextId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * Get single attachment info
 * @param {string} attachmentId - The attachment ID
 * @returns {Promise} - Attachment info
 */
export const getAttachmentInfo = (attachmentId) => {
  return request(`/api/attachments/${attachmentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * Delete an attachment
 * @param {string} attachmentId - The attachment ID
 * @returns {Promise} - Deletion result
 */
export const deleteAttachment = (attachmentId) => {
  return request(`/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * Get the download URL for an attachment
 * @param {string} attachmentId - The attachment ID
 * @returns {string} - The download URL
 */
export const getAttachmentDownloadUrl = (attachmentId) => {
  return `${apiBaseUrl()}/api/attachments/${attachmentId}/download`;
};

/**
 * Get the preview URL for an image attachment
 * @param {string} attachmentId - The attachment ID
 * @returns {string} - The preview URL
 */
export const getAttachmentPreviewUrl = (attachmentId) => {
  return `${apiBaseUrl()}/api/attachments/${attachmentId}/preview`;
};
