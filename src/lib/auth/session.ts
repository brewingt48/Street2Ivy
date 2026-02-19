/**
 * Session Management
 *
 * CRUD operations against the existing `sessions` table.
 * The table has: sid (text PK), sess (jsonb), expire (timestamptz)
 *
 * Security: 4-hour idle timeout in addition to 30-day absolute TTL.
 */

import { sql } from '@/lib/db';
import type { SessionData, Session } from './types';

/** Idle timeout: invalidate sessions with no activity for 4 hours */
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Create a new session in the database.
 * Sets lastActivity to creation time.
 */
export async function createSession(
  sid: string,
  data: SessionData,
  ttlSeconds: number = 30 * 24 * 60 * 60 // 30 days
): Promise<void> {
  const expireIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const sessWithActivity = { ...data, lastActivity: Date.now() };
  const sessJson = JSON.stringify(sessWithActivity);
  await sql`
    INSERT INTO sessions (sid, sess, expire)
    VALUES (${sid}, ${sessJson}::jsonb, ${expireIso}::timestamptz)
    ON CONFLICT (sid) DO UPDATE
    SET sess = ${sessJson}::jsonb, expire = ${expireIso}::timestamptz
  `;
}

/**
 * Retrieve a session by session ID.
 * Returns null if expired, not found, or idle too long.
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
  const data = row.sess as SessionData;

  // Check idle timeout: if lastActivity is set and older than 4 hours, invalidate
  if (data.lastActivity) {
    const idleMs = Date.now() - data.lastActivity;
    if (idleMs > IDLE_TIMEOUT_MS) {
      // Session is idle — delete it and return null
      await deleteSession(sid);
      return null;
    }
  }

  return {
    sid: row.sid,
    data,
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
 * Touch a session — update lastActivity timestamp.
 * Fire-and-forget from auth middleware to avoid blocking responses.
 */
export async function touchSession(
  sid: string,
  ttlSeconds: number = 30 * 24 * 60 * 60
): Promise<void> {
  const now = Date.now();
  await sql`
    UPDATE sessions
    SET sess = jsonb_set(sess, '{lastActivity}', ${String(now)}::jsonb)
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
