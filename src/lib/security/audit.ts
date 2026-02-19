/**
 * Audit Logging
 *
 * Writes security events to the PostgreSQL audit_log table.
 * Also outputs structured JSON to stdout for Heroku log drain capture.
 *
 * Uses the existing schema at /src/lib/db/schema/audit.ts.
 */

import { sql } from '@/lib/db';

export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'ACCOUNT_LOCKOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CSRF_FAILURE'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'USER_REGISTERED'
  | 'USER_BLOCKED'
  | 'USER_DELETED'
  | 'ADMIN_ACTION'
  | 'EXPORT_REQUESTED'
  | 'EXPORT_DOWNLOADED'
  | 'FILE_SCAN_WARNING';

interface AuditLogData {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Write an audit log entry to the database and stdout.
 * Fire-and-forget — errors are caught and logged, never thrown.
 */
export async function auditLog(
  action: AuditEventType,
  data: AuditLogData
): Promise<void> {
  const logEntry = {
    action,
    ...data,
    timestamp: new Date().toISOString(),
  };

  // Always write to stdout for Heroku log drain (Papertrail, Datadog, etc.)
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);

  // Write to database (fire-and-forget)
  try {
    await sql`
      INSERT INTO audit_log (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES (
        ${data.userId || null},
        ${action},
        ${data.resource || data.path || null},
        ${data.resourceId || null},
        ${JSON.stringify(data.details || { email: data.email })}::jsonb,
        ${data.ip || null},
        ${data.userAgent || null}
      )
    `;
  } catch (error) {
    // Never let audit logging break the request flow
    console.error('[AUDIT] Failed to write audit log to database:', error);
  }
}

/**
 * Helper to extract client IP and user agent from a request.
 */
export function extractRequestInfo(request: Request): {
  ip: string;
  userAgent: string;
} {
  const headers = request.headers;
  return {
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
  };
}
