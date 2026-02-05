/**
 * Security middleware and utilities for Street2Ivy API
 *
 * This module provides authentication, authorization, input validation,
 * and rate limiting utilities for API endpoints.
 */

const { getSdk } = require('./sdk');

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
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    req.user = currentUser;
    next();
  } catch (e) {
    // Check if this is an authentication error
    if (e.status === 401 || e.status === 403) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
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
const requireUserType = (allowedUserTypes) => {
  return async (req, res, next) => {
    // First ensure user is authenticated
    if (!req.user) {
      try {
        const sdk = getSdk(req, res);
        const userResponse = await sdk.currentUser.show();
        req.user = userResponse?.data?.data;
      } catch (e) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!hasUserType(req.user, allowedUserTypes)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        code: 'FORBIDDEN',
        requiredRoles: allowedUserTypes
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

// ================ INPUT VALIDATION ================ //

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

  // If HTML not allowed, escape HTML entities
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  return sanitized;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate domain format
 */
const isValidDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return false;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
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
    field: field
  });
};

// ================ RATE LIMITING (In-Memory) ================ //

// Simple in-memory rate limiter
// For production, use Redis-based solution
const rateLimitStore = new Map();

/**
 * Clean up old rate limit entries (run periodically)
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Rate limiting middleware factory
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.message - Error message
 * @param {Function} options.keyGenerator - Function to generate rate limit key (default: IP)
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // 100 requests per window default
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown'
  } = options;

  return (req, res, next) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      // Start new window
      record = {
        count: 1,
        windowStart: now,
        windowMs: windowMs
      };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.windowStart + windowMs) / 1000));

    if (record.count > max) {
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
      });
    }

    next();
  };
};

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests for this operation. Please wait a moment.'
});

/**
 * Standard rate limiter for general API endpoints
 */
const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: 'Too many requests. Please try again later.'
});

// ================ SECURITY HEADERS ================ //

/**
 * Add security headers to response
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

  next();
};

// ================ AUDIT LOGGING ================ //

/**
 * Log security-relevant events
 */
const auditLog = (eventType, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    ...data
  };

  // In production, send to proper logging service
  console.log('[AUDIT]', JSON.stringify(logEntry));
};

module.exports = {
  // Authentication
  requireAuth,
  getCurrentUser,

  // Authorization
  hasUserType,
  requireUserType,
  verifySystemAdmin,
  verifyEducationalAdmin,
  verifyCorporatePartner,

  // Validation
  sanitizeString,
  isValidEmail,
  isValidUUID,
  isValidDomain,
  validatePagination,
  validationError,

  // Rate Limiting
  rateLimit,
  strictRateLimit,
  standardRateLimit,

  // Security
  securityHeaders,
  auditLog
};
