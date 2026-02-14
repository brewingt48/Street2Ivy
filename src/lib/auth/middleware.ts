/**
 * Auth Middleware Helpers
 *
 * Server-side functions for route protection and role-based access control.
 * Used in API routes and Server Components.
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from './session';
import { sql } from '@/lib/db';
import type { AuthUser, Session } from './types';

/**
 * Get the current session from the request.
 * Reads the session ID from the x-session-id header (set by Edge middleware).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const headersList = headers();
  const sessionId = headersList.get('x-session-id');

  if (!sessionId) return null;

  return await getSession(sessionId);
}

/**
 * Get the full AuthUser for the current session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const result = await sql`
    SELECT
      id,
      email,
      role,
      first_name,
      last_name,
      display_name,
      email_verified,
      tenant_id,
      institution_domain,
      avatar_url,
      last_login_at
    FROM users
    WHERE id = ${session.data.userId}
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    emailVerified: row.email_verified,
    tenantId: row.tenant_id,
    institutionDomain: row.institution_domain,
    avatarUrl: row.avatar_url,
    lastLoginAt: row.last_login_at,
  };
}

/**
 * Require authentication — returns the session or throws a 401 response.
 * Use in API routes.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session) {
    throw NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Require a specific role — returns the session or throws 403.
 * Use in API routes.
 */
export async function requireRole(
  ...allowedRoles: AuthUser['role'][]
): Promise<Session> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.data.role)) {
    throw NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Check if the current user is authenticated (non-throwing).
 * Use in Server Components for conditional rendering.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

/**
 * Get user by email (for registration uniqueness check, login, etc.)
 */
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const result = await sql`
    SELECT
      id,
      email,
      role,
      first_name,
      last_name,
      display_name,
      email_verified,
      tenant_id,
      institution_domain,
      avatar_url,
      last_login_at
    FROM users
    WHERE email = ${email.toLowerCase().trim()}
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    emailVerified: row.email_verified,
    tenantId: row.tenant_id,
    institutionDomain: row.institution_domain,
    avatarUrl: row.avatar_url,
    lastLoginAt: row.last_login_at,
  };
}
