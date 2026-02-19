/**
 * Response Sanitization
 *
 * Automatically strips sensitive fields from API responses to prevent
 * accidental exposure of credentials, tokens, and PII.
 *
 * Ported from legacy server/api-util/security.js lines 715-775.
 */

/**
 * Field names that should never appear in API responses.
 * Case-insensitive matching applied.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'secret',
  'clientsecret',
  'client_secret',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'ssn',
  'socialsecuritynumber',
  'social_security_number',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'bankaccount',
  'bank_account',
  'resettokenhash',
  'resettoken',
]);

/**
 * Recursively remove sensitive fields from a response object.
 * Returns a new object with sensitive fields stripped.
 */
export function sanitizeResponse<T>(data: T, maxDepth = 10, currentDepth = 0): T {
  if (currentDepth > maxDepth) return data;
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponse(item, maxDepth, currentDepth + 1)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Check if field name matches any sensitive pattern (case-insensitive)
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      continue; // Strip this field entirely
    }

    // Recurse into nested objects
    if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeResponse(value, maxDepth, currentDepth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
