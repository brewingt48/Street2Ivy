/**
 * Password Hashing & Verification
 *
 * Delegates to PostgreSQL crypt() + gen_salt() to match existing bcrypt hashes.
 * We NEVER do password hashing in Node.js — the database owns the algorithm.
 *
 * Requires pgcrypto extension (already installed in the database).
 */

import { sql } from '@/lib/db';

/**
 * Verify a plaintext password against the stored hash using PostgreSQL crypt().
 *
 * @param email - User email to look up
 * @param password - Plaintext password to verify
 * @returns The user ID if match, null otherwise
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<string | null> {
  const result = await sql`
    SELECT id
    FROM users
    WHERE email = ${email}
      AND crypt(${password}, password_hash) = password_hash
  `;

  if (result.length === 0) return null;
  return result[0].id;
}

/**
 * Hash a password using PostgreSQL crypt() + gen_salt('bf', 10).
 *
 * @param password - Plaintext password to hash
 * @returns The bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  const result = await sql`
    SELECT crypt(${password}, gen_salt('bf', 10)) AS hash
  `;
  return result[0].hash;
}

/**
 * Update a user's password hash in the database.
 *
 * @param userId - User ID
 * @param newPassword - New plaintext password
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await sql`
    UPDATE users
    SET password_hash = crypt(${newPassword}, gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE id = ${userId}
  `;
}
