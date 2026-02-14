/**
 * Session Management
 *
 * CRUD operations against the existing `sessions` table.
 * The table has: sid (text PK), sess (jsonb), expire (timestamptz)
 */

import { sql } from '@/lib/db';
import type { SessionData, Session } from './types';

/**
 * Create a new session in the database.
 */
export async function createSession(
  sid: string,
  data: SessionData,
  ttlSeconds: number = 30 * 24 * 60 * 60 // 30 days
): Promise<void> {
  const expire = new Date(Date.now() + ttlSeconds * 1000);
  await sql`
    INSERT INTO sessions (sid, sess, expire)
    VALUES (${sid}, ${JSON.stringify(data)}::jsonb, ${expire})
    ON CONFLICT (sid) DO UPDATE
    SET sess = ${JSON.stringify(data)}::jsonb, expire = ${expire}
  `;
}

/**
 * Retrieve a session by session ID.
 * Returns null if expired or not found.
 */
export async function getSession(sid: string): Promise<Session | null> {
  const result = await sql`
    SELECT sid, sess, expire
    FROM sessions
    WHERE sid = ${sid}
      AND expire > NOW()
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    sid: row.sid,
    data: row.sess as SessionData,
    expire: row.expire,
  };
}

/**
 * Delete a session (logout).
 */
export async function deleteSession(sid: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE sid = ${sid}`;
}

/**
 * Touch a session — extend expiry without modifying data.
 */
export async function touchSession(
  sid: string,
  ttlSeconds: number = 30 * 24 * 60 * 60
): Promise<void> {
  const expire = new Date(Date.now() + ttlSeconds * 1000);
  await sql`
    UPDATE sessions
    SET expire = ${expire}
    WHERE sid = ${sid}
  `;
}

/**
 * Delete all expired sessions (housekeeping).
 */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await sql`
    DELETE FROM sessions WHERE expire < NOW()
  `;
  return result.count;
}

/**
 * Delete all sessions for a user (force logout everywhere).
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await sql`
    DELETE FROM sessions
    WHERE (sess->>'userId')::text = ${userId}
  `;
}
