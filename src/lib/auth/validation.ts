/**
 * Auth Validation Schemas
 *
 * Zod schemas for validating auth-related API inputs.
 * Password fields enforce the policy from password-policy.ts (NIST SP 800-63B).
 */

import { z } from 'zod';
import { validatePassword, PASSWORD_POLICY } from '@/lib/security/password-policy';

/**
 * Zod refinement that delegates to the password policy engine.
 * Returns all policy violation errors.
 */
const passwordField = z
  .string()
  .min(PASSWORD_POLICY.minLength, `Password must be at least ${PASSWORD_POLICY.minLength} characters`)
  .max(PASSWORD_POLICY.maxLength, `Password must be no more than ${PASSWORD_POLICY.maxLength} characters`)
  .refine(
    (pwd: string) => validatePassword(pwd).valid,
    (pwd: string) => ({
      message: validatePassword(pwd).errors.join('. '),
    })
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: passwordField,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['student', 'corporate_partner', 'educational_admin']).default('student'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
