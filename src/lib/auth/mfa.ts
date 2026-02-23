/**
 * MFA (Multi-Factor Authentication) Library
 *
 * TOTP-based MFA using otplib for code generation/verification,
 * qrcode for QR code rendering, and AES-256-GCM for encrypting
 * secrets at rest. Backup codes are SHA-256 hashed before storage.
 *
 * Required for SOC 2 compliance and institutional security policies.
 */

import { generateSecret as otpGenerateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/handshake/encryption';
import { verifyPassword } from './password';

// App name shown in authenticator apps
const ISSUER = 'Street2Ivy';

// ---------- Types ----------

export interface MFAStatus {
  isEnabled: boolean;
  method: string;
  backupCodesRemaining: number;
  isMFARequired: boolean;
}

export interface TOTPSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface BackupCodesResult {
  codes: string[];
  hashedCodes: string[];
}

// ---------- TOTP Generation & Verification ----------

/**
 * Generate a new TOTP secret and corresponding QR code for an email address.
 * The secret is NOT yet stored — the user must verify it first.
 */
export async function generateTOTPSecret(email: string): Promise<TOTPSetup> {
  const secret = otpGenerateSecret();
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, otpauthUrl, qrCodeDataUrl };
}

/**
 * Verify a 6-digit TOTP code against an encrypted secret.
 * Returns true if the code is valid for the current or adjacent time window.
 */
export function verifyTOTPCode(encryptedSecret: string, code: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    const result = verifySync({ token: code, secret, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

// ---------- Backup Codes ----------

/**
 * Generate 8 random alphanumeric backup codes.
 * Returns both plaintext (shown to user once) and SHA-256 hashes (stored).
 */
export function generateBackupCodes(): BackupCodesResult {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    // 8-character alphanumeric codes, grouped as XXXX-XXXX for readability
    const raw = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`.toUpperCase();
    codes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return { codes, hashedCodes };
}

/**
 * SHA-256 hash a backup code for comparison.
 * Normalizes by removing dashes and uppercasing before hashing.
 */
function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify and consume a backup code.
 * On success, removes the used code and decrements the remaining count.
 * Returns true if the code matched and was consumed.
 */
export async function verifyBackupCode(
  userId: string,
  encryptedCodes: string,
  code: string
): Promise<boolean> {
  try {
    const hashedCodes: string[] = JSON.parse(decrypt(encryptedCodes));
    const inputHash = hashBackupCode(code);

    const index = hashedCodes.findIndex((h) => h === inputHash);
    if (index === -1) return false;

    // Remove the used code
    hashedCodes.splice(index, 1);

    // Update in database
    const newEncrypted = encrypt(JSON.stringify(hashedCodes));
    await sql`
      UPDATE user_mfa
      SET backup_codes_encrypted = ${newEncrypted},
          backup_codes_remaining = ${hashedCodes.length},
          last_used_at = NOW(),
          updated_at = NOW()
      WHERE user_id = ${userId} AND method = 'totp'
    `;

    return true;
  } catch {
    return false;
  }
}

// ---------- Enrollment & Lifecycle ----------

/**
 * Enroll a user in MFA.
 * Verifies the TOTP code first, then encrypts and stores the secret + backup codes.
 * Returns the plaintext backup codes (shown to user once).
 */
export async function enrollMFA(
  userId: string,
  secret: string,
  verificationCode: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  // Verify the code against the plaintext secret before storing
  const verifyResult = verifySync({ token: verificationCode, secret, epochTolerance: 30 });
  if (!verifyResult.valid) {
    return { success: false, error: 'Invalid verification code' };
  }

  // Generate backup codes
  const { codes, hashedCodes } = generateBackupCodes();

  // Encrypt the secret and backup codes for storage
  const encryptedSecret = encrypt(secret);
  const encryptedBackupCodes = encrypt(JSON.stringify(hashedCodes));

  // Upsert the MFA record
  await sql`
    INSERT INTO user_mfa (user_id, method, is_enabled, totp_secret_encrypted, totp_verified_at, backup_codes_encrypted, backup_codes_remaining)
    VALUES (${userId}, 'totp', true, ${encryptedSecret}, NOW(), ${encryptedBackupCodes}, ${hashedCodes.length})
    ON CONFLICT (user_id, method) DO UPDATE SET
      is_enabled = true,
      totp_secret_encrypted = ${encryptedSecret},
      totp_verified_at = NOW(),
      backup_codes_encrypted = ${encryptedBackupCodes},
      backup_codes_remaining = ${hashedCodes.length},
      updated_at = NOW()
  `;

  return { success: true, backupCodes: codes };
}

/**
 * Disable MFA for a user. Requires password verification.
 * Deletes all encrypted secrets and backup codes.
 */
export async function disableMFA(
  userId: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  // Verify password
  const verifiedUserId = await verifyPassword(email, password);
  if (!verifiedUserId || verifiedUserId !== userId) {
    return { success: false, error: 'Invalid password' };
  }

  await sql`
    DELETE FROM user_mfa
    WHERE user_id = ${userId} AND method = 'totp'
  `;

  return { success: true };
}

/**
 * Get the MFA status for a user.
 */
export async function getUserMFAStatus(userId: string): Promise<{
  isEnabled: boolean;
  method: string;
  backupCodesRemaining: number;
}> {
  const result = await sql`
    SELECT is_enabled, method, backup_codes_remaining
    FROM user_mfa
    WHERE user_id = ${userId} AND method = 'totp'
  `;

  if (result.length === 0) {
    return { isEnabled: false, method: 'totp', backupCodesRemaining: 0 };
  }

  return {
    isEnabled: result[0].is_enabled,
    method: result[0].method,
    backupCodesRemaining: result[0].backup_codes_remaining ?? 0,
  };
}

/**
 * Check whether MFA is required for a tenant.
 * Returns true if the tenant has mfa_required = true.
 */
export async function isMFARequired(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;

  const result = await sql`
    SELECT mfa_required
    FROM tenants
    WHERE id = ${tenantId}
  `;

  if (result.length === 0) return false;
  return result[0].mfa_required === true;
}

/**
 * Get the encrypted TOTP secret for a user (used during login verification).
 */
export async function getUserMFARecord(userId: string): Promise<{
  isEnabled: boolean;
  totpSecretEncrypted: string | null;
  backupCodesEncrypted: string | null;
} | null> {
  const result = await sql`
    SELECT is_enabled, totp_secret_encrypted, backup_codes_encrypted
    FROM user_mfa
    WHERE user_id = ${userId} AND method = 'totp'
  `;

  if (result.length === 0) return null;

  return {
    isEnabled: result[0].is_enabled,
    totpSecretEncrypted: result[0].totp_secret_encrypted,
    backupCodesEncrypted: result[0].backup_codes_encrypted,
  };
}

/**
 * Mark a session as MFA-verified in the database.
 */
export async function markSessionMFAVerified(sid: string): Promise<void> {
  await sql`
    UPDATE sessions
    SET mfa_verified = true
    WHERE sid = ${sid}
  `;
}

/**
 * Check if a session has been MFA-verified.
 */
export async function isSessionMFAVerified(sid: string): Promise<boolean> {
  const result = await sql`
    SELECT mfa_verified
    FROM sessions
    WHERE sid = ${sid}
  `;

  if (result.length === 0) return false;
  return result[0].mfa_verified === true;
}

/**
 * Regenerate backup codes for a user. Requires a valid TOTP code.
 * Returns the new plaintext backup codes.
 */
export async function regenerateBackupCodes(
  userId: string,
  totpCode: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  // Get the user's encrypted secret
  const record = await getUserMFARecord(userId);
  if (!record || !record.isEnabled || !record.totpSecretEncrypted) {
    return { success: false, error: 'MFA is not enabled' };
  }

  // Verify TOTP code
  if (!verifyTOTPCode(record.totpSecretEncrypted, totpCode)) {
    return { success: false, error: 'Invalid TOTP code' };
  }

  // Generate new backup codes
  const { codes, hashedCodes } = generateBackupCodes();
  const encryptedBackupCodes = encrypt(JSON.stringify(hashedCodes));

  await sql`
    UPDATE user_mfa
    SET backup_codes_encrypted = ${encryptedBackupCodes},
        backup_codes_remaining = ${hashedCodes.length},
        updated_at = NOW()
    WHERE user_id = ${userId} AND method = 'totp'
  `;

  return { success: true, backupCodes: codes };
}

/**
 * Update the last_used_at timestamp for a user's MFA record.
 */
export async function touchMFAUsage(userId: string): Promise<void> {
  await sql`
    UPDATE user_mfa
    SET last_used_at = NOW()
    WHERE user_id = ${userId} AND method = 'totp'
  `;
}
