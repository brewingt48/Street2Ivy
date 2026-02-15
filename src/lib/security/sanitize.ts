/**
 * Input Sanitization
 *
 * Prevents XSS, null byte injection, and control character attacks.
 * Ported from legacy server/api-util/security.js lines 253-370.
 */

/**
 * Sanitize a string value:
 * - Trim whitespace
 * - Truncate to max length
 * - Remove null bytes and control characters
 * - HTML-encode dangerous characters (unless allowHtml)
 */
export function sanitizeString(
  input: string | null | undefined,
  options: { maxLength?: number; allowHtml?: boolean } = {}
): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;

  const { maxLength = 1000, allowHtml = false } = options;

  let sanitized = input.trim();

  // Truncate
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines \n, carriage returns \r, tabs \t)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // HTML-encode dangerous characters
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
}

/**
 * Recursively sanitize all string values in an object.
 * Handles nested objects and arrays up to maxDepth.
 */
export function sanitizeObject<T>(
  obj: T,
  options: { maxLength?: number; allowHtml?: boolean; maxDepth?: number } = {},
  currentDepth = 0
): T {
  const { maxDepth = 10 } = options;

  if (currentDepth > maxDepth) return obj;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj, options) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      sanitizeObject(item, options, currentDepth + 1)
    ) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value, options, currentDepth + 1);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Validate email format (RFC 5322 simplified).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate UUID v4 format.
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validate URL format (http/https only).
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a string contains null bytes (potential injection attack).
 */
export function containsNullBytes(input: string): boolean {
  return input.includes('\0');
}
