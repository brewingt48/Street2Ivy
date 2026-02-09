/**
 * Standard Error Codes
 *
 * Centralized error code constants for consistent API responses.
 * All error responses should use: { error: { code: ERROR_CODE, message: "..." } }
 *
 * Stage 5 Production Hardening.
 */

const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',

  // Input errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // State errors
  INVALID_STATE: 'INVALID_STATE',
  SUSPENDED: 'SUSPENDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SAVE_FAILED: 'SAVE_FAILED',
};

module.exports = ERROR_CODES;
