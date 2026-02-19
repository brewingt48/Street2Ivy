/**
 * Password Policy
 *
 * Enforces strong passwords per NIST SP 800-63B guidelines:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - Requires uppercase, lowercase, digit, and special character
 * - Blocks common weak passwords
 */

export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
} as const;

/**
 * Common weak passwords that must be blocked regardless of complexity.
 * Includes NIST-recommended blocklist entries.
 */
const BLOCKED_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'password1234',
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop',
  'letmein', 'welcome', 'welcome1',
  'admin', 'administrator', 'admin123',
  'proveground', 'proveground1', 'proveground123',
  'street2ivy', 'campus2career',
  'abc123', 'abcdef', 'abcdefg',
  'iloveyou', 'sunshine', 'princess', 'football', 'charlie',
  'trustno1', 'dragon', 'master', 'monkey', 'shadow',
  'changeme', 'changeme1', 'changeme123',
]);

/**
 * Validate a password against the policy.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_POLICY.maxLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check blocklist (case-insensitive)
  if (BLOCKED_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password.');
  }

  return { valid: errors.length === 0, errors };
}
