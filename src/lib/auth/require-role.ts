/**
 * Server-side Role Requirement
 *
 * Use in Server Components and API routes to enforce role-based access.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from './middleware';
import type { AuthUser } from './types';

/**
 * Require the current user to have one of the specified roles.
 * Redirects to /login if unauthenticated, or to /dashboard if unauthorized.
 *
 * @param allowedRoles - Roles that are permitted
 * @returns The authenticated user
 */
export async function requirePageRole(
  ...allowedRoles: AuthUser['role'][]
): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard instead of showing 403
    const defaultRoutes: Record<string, string> = {
      admin: '/admin',
      student: '/dashboard',
      corporate_partner: '/corporate',
      educational_admin: '/education',
    };
    redirect(defaultRoutes[user.role] || '/dashboard');
  }

  return user;
}
