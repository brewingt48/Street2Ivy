'use client';

/**
 * Role Gate Component
 *
 * Conditionally renders children based on the user's role.
 * Use in client components for role-based UI visibility.
 */

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: string[];
  userRole: string;
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  allowedRoles,
  userRole,
  fallback = null,
}: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
