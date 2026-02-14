import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eduAdminAppStatusEnum } from './enums';

export const studentWaitlist = pgTable('student_waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  domain: text('domain'),
  institutionName: text('institution_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(1),
  contacted: boolean('contacted').notNull().default(false),
  notes: text('notes').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  updatedBy: uuid('updated_by'),
});

export const eduAdminApplications = pgTable('edu_admin_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  emailDomain: text('email_domain'),
  institutionName: text('institution_name'),
  institutionWebsite: text('institution_website'),
  jobTitle: text('job_title'),
  department: text('department'),
  workPhone: text('work_phone'),
  reason: text('reason'),
  studentCount: text('student_count'),
  existingUserId: uuid('existing_user_id'),
  status: eduAdminAppStatusEnum('status').notNull().default('pending'),
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by'),
  notes: text('notes'),
});
