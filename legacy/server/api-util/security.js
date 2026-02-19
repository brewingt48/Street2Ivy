/**
 * Security middleware and utilities for Street2Ivy API
 *
 * This module provides comprehensive security features including:
 * - Authentication & Authorization
 * - Input Validation & Sanitization
 * - Rate Limiting
 * - CSRF Protection
 * - Security Headers (HSTS, etc.)
 * - Audit Logging
 * - File Upload Security
 * - Password Policy Enforcement
 * - API Response Sanitization
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getSdk } = require('./sdk');

// ================ CONFIGURATION ================ //

const SECURITY_CONFIG = {
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 1000,
  strictRateLimitWindowMs: 60 * 1000, // 1 minute
  strictRateLimitMaxRequests: 10,

  // Password policy
  passwordMinLength: 12,
  passwordMaxLength: 128,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,

  // File upload
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'],

  // Session
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  csrfTokenExpiry: 60 * 60 * 1000, // 1 hour

  // Audit log retention
  auditLogRetentionDays: 365,

  // Data export
  exportValidityPeriod: 24 * 60 * 60 * 1000, // 24 hours
  maxExportRecords: 10000,
};

// ================ AUTHENTICATION MIDDLEWARE ================ //

/**
 * Middleware to require authentication for an endpoint.
 * Sets req.user with the current user data if authenticated.
 */
const requireAuth = async (req, res, next) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    const currentUser = userResponse?.data?.data;

    if (!currentUser) {
      auditLog('AUTH_FAILURE', {
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        path: req.path,
        reason: 'No user session',
      });
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    req.user = currentUser;
    next();
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      auditLog('AUTH_FAILURE', {
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        path: req.path,
        reason: 'Invalid session',
      });
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    console.error('Authentication middleware error:', e.message);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
};

/**
 * Get current user from request (for endpoints that need user but don't require auth)
 */
const getCurrentUser = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    return userResponse?.data?.data || null;
  } catch (e) {
    return null;
  }
};

/**
 * Get client IP address, accounting for proxies
 */
const getClientIP = req => {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

// ================ AUTHORIZATION UTILITIES ================ //

/**
 * Check if user has one of the allowed user types
 */
const hasUserType = (user, allowedTypes) => {
  if (!user || !Array.isArray(allowedTypes)) return false;
  const userType = user.attributes?.profile?.publicData?.userType;
  return allowedTypes.includes(userType);
};

/**
 * Middleware factory for role-based access control
 * @param {Array<string>} allowedUserTypes - Array of allowed user types
 */
const requireUserType = allowedUserTypes => {
  return async (req, res, next) => {
    if (!req.user) {
      try {
        const sdk = getSdk(req, res);
        const userResponse = await sdk.currentUser.show();
        req.user = userResponse?.data?.data;
      } catch (e) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!hasUserType(req.user, allowedUserTypes)) {
      auditLog('AUTHORIZATION_FAILURE', {
        userId: req.user?.id?.uuid,
        userType: req.user?.attributes?.profile?.publicData?.userType,
        requiredTypes: allowedUserTypes,
        path: req.path,
        ip: getClientIP(req),
      });
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        code: 'FORBIDDEN',
        requiredRoles: allowedUserTypes,
      });
    }

    next();
  };
};

/**
 * Verify user is a system admin
 */
const verifySystemAdmin = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    const currentUser = userResponse?.data?.data;
    const publicData = currentUser?.attributes?.profile?.publicData || {};

    if (publicData.userType !== 'system-admin') {
      return null;
    }

    return currentUser;
  } catch (e) {
    return null;
  }
};

/**
 * Verify user is an educational admin
 */
const verifyEducationalAdmin = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    const currentUser = userResponse?.data?.data;
    const publicData = currentUser?.attributes?.profile?.publicData || {};

    if (publicData.userType !== 'educational-admin') {
      return null;
    }

    return currentUser;
  } catch (e) {
    return null;
  }
};

/**
 * Verify user is a corporate partner
 */
const verifyCorporatePartner = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    const currentUser = userResponse?.data?.data;
    const publicData = currentUser?.attributes?.profile?.publicData || {};

    if (publicData.userType !== 'corporate-partner') {
      return null;
    }

    return currentUser;
  } catch (e) {
    return null;
  }
};

// ================ INPUT VALIDATION & SANITIZATION ================ //

/**
 * Sanitize string input - removes potential XSS and injection characters
 */
const sanitizeString = (input, options = {}) => {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;

  const { maxLength = 1000, allowHtml = false } = options;

  let sanitized = input.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // If HTML not allowed, escape HTML entities
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return sanitized;
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj, options = {}) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return sanitizeString(String(obj), options);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key, { maxLength: 100 });
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  return sanitized;
};

/**
 * Validate email format
 */
const isValidEmail = email => {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate UUID format
 */
const isValidUUID = uuid => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate domain format
 */
const isValidDomain = domain => {
  if (!domain || typeof domain !== 'string') return false;
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

/**
 * Validate URL format
 */
const isValidURL = url => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page, perPage) => {
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validPerPage = Math.min(Math.max(1, parseInt(perPage, 10) || 20), 100);
  return { page: validPage, perPage: validPerPage };
};

/**
 * Create a validation error response
 */
const validationError = (res, message, field = null) => {
  return res.status(400).json({
    error: message,
    code: 'VALIDATION_ERROR',
    field: field,
  });
};

// ================ PASSWORD POLICY ================ //

/**
 * Validate password against security policy
 */
const validatePassword = password => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < SECURITY_CONFIG.passwordMinLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.passwordMinLength} characters`);
  }

  if (password.length > SECURITY_CONFIG.passwordMaxLength) {
    errors.push(`Password must be no more than ${SECURITY_CONFIG.passwordMaxLength} characters`);
  }

  if (SECURITY_CONFIG.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (SECURITY_CONFIG.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (SECURITY_CONFIG.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (SECURITY_CONFIG.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common. Please choose a stronger password.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ================ CSRF PROTECTION ================ //

// CSRF token store (in production, use Redis)
const csrfTokenStore = new Map();

/**
 * Generate CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF token middleware - generates and validates tokens
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.cookies?.['st-auth'] || req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(403).json({
      error: 'CSRF validation failed: No session',
      code: 'CSRF_ERROR',
    });
  }

  const token = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!token) {
    // Generate new token and return it
    const newToken = generateCSRFToken();
    csrfTokenStore.set(sessionId, {
      token: newToken,
      created: Date.now(),
    });

    return res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED',
      token: newToken,
    });
  }

  const storedData = csrfTokenStore.get(sessionId);
  if (!storedData || storedData.token !== token) {
    auditLog('CSRF_FAILURE', {
      ip: getClientIP(req),
      sessionId: sessionId.substring(0, 8) + '...',
      path: req.path,
    });
    return res.status(403).json({
      error: 'CSRF token invalid',
      code: 'CSRF_INVALID',
    });
  }

  // Check token expiry
  if (Date.now() - storedData.created > SECURITY_CONFIG.csrfTokenExpiry) {
    csrfTokenStore.delete(sessionId);
    return res.status(403).json({
      error: 'CSRF token expired',
      code: 'CSRF_EXPIRED',
    });
  }

  // Regenerate token after use (one-time token)
  const newToken = generateCSRFToken();
  csrfTokenStore.set(sessionId, {
    token: newToken,
    created: Date.now(),
  });
  res.setHeader('X-CSRF-Token', newToken);

  next();
};

/**
 * Generate CSRF token endpoint handler
 */
const getCSRFToken = (req, res) => {
  const sessionId = req.cookies?.['st-auth'] || crypto.randomBytes(16).toString('hex');
  const token = generateCSRFToken();

  csrfTokenStore.set(sessionId, {
    token: token,
    created: Date.now(),
  });

  res.json({ token });
};

// Clean up expired CSRF tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of csrfTokenStore.entries()) {
    if (now - data.created > SECURITY_CONFIG.csrfTokenExpiry * 2) {
      csrfTokenStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

// ================ RATE LIMITING ================ //

const rateLimitStore = new Map();

/**
 * Clean up old rate limit entries
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
};

setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = SECURITY_CONFIG.rateLimitWindowMs,
    max = SECURITY_CONFIG.rateLimitMaxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = req => getClientIP(req),
    skipFailedRequests = false,
  } = options;

  return (req, res, next) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      record = {
        count: 1,
        windowStart: now,
        windowMs: windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.windowStart + windowMs) / 1000));

    if (record.count > max) {
      auditLog('RATE_LIMIT_EXCEEDED', {
        ip: getClientIP(req),
        path: req.path,
        count: record.count,
        limit: max,
      });
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
      });
    }

    next();
  };
};

const strictRateLimit = rateLimit({
  windowMs: SECURITY_CONFIG.strictRateLimitWindowMs,
  max: SECURITY_CONFIG.strictRateLimitMaxRequests,
  message: 'Too many requests for this operation. Please wait a moment.',
});

const standardRateLimit = rateLimit({
  windowMs: SECURITY_CONFIG.rateLimitWindowMs,
  max: SECURITY_CONFIG.rateLimitMaxRequests,
  message: 'Too many requests. Please try again later.',
});

// ================ SECURITY HEADERS ================ //

/**
 * Add comprehensive security headers to response
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS - Force HTTPS for 1 year, including subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent Adobe Flash and Acrobat from loading content
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Disable caching for API responses by default
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
};

// ================ FILE UPLOAD SECURITY ================ //

/**
 * Validate file upload
 */
const validateFileUpload = file => {
  const errors = [];

  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }

  // Check file size
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    errors.push(`File size exceeds maximum of ${SECURITY_CONFIG.maxFileSize / 1024 / 1024}MB`);
  }

  // Check MIME type
  if (!SECURITY_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file extension
  const ext = path.extname(file.originalname || file.name || '').toLowerCase();
  if (!SECURITY_CONFIG.allowedExtensions.includes(ext)) {
    errors.push(`File extension ${ext} is not allowed`);
  }

  // Check for double extensions (e.g., file.pdf.exe)
  const nameParts = (file.originalname || file.name || '').split('.');
  if (nameParts.length > 2) {
    const secondToLast = '.' + nameParts[nameParts.length - 2].toLowerCase();
    if (SECURITY_CONFIG.allowedExtensions.includes(secondToLast)) {
      errors.push('Double file extensions are not allowed');
    }
  }

  // Check for null bytes in filename (path traversal attack)
  if ((file.originalname || file.name || '').includes('\0')) {
    errors.push('Invalid filename');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize filename for storage
 */
const sanitizeFilename = filename => {
  // Remove path components
  let sanitized = path.basename(filename);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Replace dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.substring(1);
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
};

// ================ API RESPONSE SANITIZATION ================ //

/**
 * Fields that should never be exposed in API responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'apiKey',
  'privateKey',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  'cvv',
  'bankAccount',
];

/**
 * Sanitize API response to remove sensitive data
 */
const sanitizeResponse = (data, options = {}) => {
  const { sensitiveFields = SENSITIVE_FIELDS, depth = 0, maxDepth = 10 } = options;

  if (depth > maxDepth) return data;
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, { ...options, depth: depth + 1 }));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        continue;
      }
      sanitized[key] = sanitizeResponse(value, { ...options, depth: depth + 1 });
    }
    return sanitized;
  }

  return data;
};

/**
 * Response sanitization middleware
 */
const responseSanitizer = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = data => {
    const sanitized = sanitizeResponse(data);
    return originalJson(sanitized);
  };

  next();
};

// ================ AUDIT LOGGING ================ //

// Audit log store (in production, use persistent storage)
const auditLogStore = [];
const MAX_AUDIT_LOG_SIZE = 10000;

/**
 * Log security-relevant events
 */
const auditLog = (eventType, data) => {
  const logEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    ...data,
  };

  // Add to in-memory store
  auditLogStore.push(logEntry);

  // Trim old entries
  while (auditLogStore.length > MAX_AUDIT_LOG_SIZE) {
    auditLogStore.shift();
  }

  // Log to console (in production, send to proper logging service)
  console.log('[AUDIT]', JSON.stringify(logEntry));

  // In production, send to external logging service
  // sendToLoggingService(logEntry);
};

/**
 * Get audit logs (for admin dashboard)
 */
const getAuditLogs = (options = {}) => {
  const { eventType, userId, startDate, endDate, limit = 100, offset = 0 } = options;

  let logs = [...auditLogStore];

  // Filter by event type
  if (eventType) {
    logs = logs.filter(log => log.eventType === eventType);
  }

  // Filter by user ID
  if (userId) {
    logs = logs.filter(log => log.userId === userId);
  }

  // Filter by date range
  if (startDate) {
    logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
  }

  // Sort by timestamp descending
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Paginate
  const total = logs.length;
  logs = logs.slice(offset, offset + limit);

  return {
    logs,
    total,
    limit,
    offset,
  };
};

// ================ DATA EXPORT SECURITY ================ //

// Export tokens store
const exportTokenStore = new Map();

/**
 * Generate secure export token
 */
const generateExportToken = (userId, exportType, options = {}) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SECURITY_CONFIG.exportValidityPeriod;

  exportTokenStore.set(token, {
    userId,
    exportType,
    options,
    createdAt: Date.now(),
    expiresAt,
    downloaded: false,
  });

  auditLog('EXPORT_REQUESTED', {
    userId,
    exportType,
    tokenPrefix: token.substring(0, 8),
  });

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

/**
 * Validate and consume export token
 */
const validateExportToken = token => {
  const data = exportTokenStore.get(token);

  if (!data) {
    return { valid: false, error: 'Invalid export token' };
  }

  if (Date.now() > data.expiresAt) {
    exportTokenStore.delete(token);
    return { valid: false, error: 'Export token expired' };
  }

  if (data.downloaded) {
    return { valid: false, error: 'Export already downloaded' };
  }

  // Mark as downloaded
  data.downloaded = true;

  auditLog('EXPORT_DOWNLOADED', {
    userId: data.userId,
    exportType: data.exportType,
    tokenPrefix: token.substring(0, 8),
  });

  return {
    valid: true,
    userId: data.userId,
    exportType: data.exportType,
    options: data.options,
  };
};

// Clean up expired export tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of exportTokenStore.entries()) {
    if (now > data.expiresAt) {
      exportTokenStore.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

// ================ REQUEST VALIDATION MIDDLEWARE ================ //

/**
 * Validate request body against schema
 */
const validateRequestBody = schema => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }

        if (rules.type === 'email' && !isValidEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }

        if (rules.type === 'uuid' && !isValidUUID(value)) {
          errors.push(`${field} must be a valid UUID`);
        }

        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} must be no more than ${rules.maxLength} characters`);
        }

        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    next();
  };
};

// ================ EXPORTS ================ //

module.exports = {
  // Configuration
  SECURITY_CONFIG,

  // Authentication
  requireAuth,
  getCurrentUser,
  getClientIP,

  // Authorization
  hasUserType,
  requireUserType,
  verifySystemAdmin,
  verifyEducationalAdmin,
  verifyCorporatePartner,

  // Validation
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidUUID,
  isValidDomain,
  isValidURL,
  validatePagination,
  validationError,
  validateRequestBody,

  // Password
  validatePassword,

  // CSRF
  csrfProtection,
  getCSRFToken,
  generateCSRFToken,

  // Rate Limiting
  rateLimit,
  strictRateLimit,
  standardRateLimit,

  // Security Headers
  securityHeaders,

  // File Upload
  validateFileUpload,
  sanitizeFilename,

  // Response Sanitization
  sanitizeResponse,
  responseSanitizer,

  // Audit Logging
  auditLog,
  getAuditLogs,

  // Data Export
  generateExportToken,
  validateExportToken,
};
