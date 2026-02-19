/**
 * Auth Types
 *
 * Session and user types for the authentication system.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'corporate_partner' | 'educational_admin';
  firstName: string;
  lastName: string;
  displayName: string | null;
  emailVerified: boolean;
  tenantId: string | null;
  institutionDomain: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
}

export interface SessionData {
  userId: string;
  email: string;
  role: AuthUser['role'];
  tenantId: string | null;
  createdAt: number; // epoch ms
  lastActivity?: number; // epoch ms — updated on each request
}

export interface Session {
  sid: string;
  data: SessionData;
  expire: Date;
}
