/**
 * Auth Module — barrel export
 */

export { verifyPassword, hashPassword, updatePassword } from './password';
export { createSession, getSession, deleteSession, touchSession, cleanExpiredSessions, deleteUserSessions } from './session';
export { generateSessionId, setSessionCookie, getSessionCookie, deleteSessionCookie, COOKIE_NAME, SESSION_MAX_AGE } from './cookies';
export { getCurrentSession, getCurrentUser, requireAuth, requireRole, isAuthenticated, getUserByEmail } from './middleware';
export { requirePageRole } from './require-role';
export type { AuthUser, SessionData, Session } from './types';
