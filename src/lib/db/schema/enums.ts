import { pgEnum } from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('membership_status', [
  'pending',
  'active',
  'inactive',
]);

export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'inactive',
  'suspended',
]);

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'student',
  'corporate_partner',
  'educational_admin',
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'accepted',
  'rejected',
  'declined',
  'withdrawn',
  'cancelled',
  'completed',
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'declined',
]);

export const messageTypeEnum = pgEnum('message_type', ['user', 'system']);

export const messageSeverityEnum = pgEnum('message_severity', [
  'info',
  'warning',
  'urgent',
]);

export const ndaStatusEnum = pgEnum('nda_status', ['pending', 'completed']);

export const blogStatusEnum = pgEnum('blog_status', [
  'draft',
  'published',
  'archived',
]);

export const initiatedByTypeEnum = pgEnum('initiated_by_type', [
  'student',
  'corporate',
]);

export const senderRoleTypeEnum = pgEnum('sender_role_type', [
  'student',
  'corporate',
  'system',
  'educational-admin',
  'system-admin',
]);

export const eduAdminAppStatusEnum = pgEnum('edu_admin_app_status', [
  'pending',
  'approved',
  'rejected',
]);

export const attachmentFileTypeEnum = pgEnum('attachment_file_type', [
  'file',
  'image',
  'document',
]);
