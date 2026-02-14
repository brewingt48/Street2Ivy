import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import {
  applicationStatusEnum,
  initiatedByTypeEnum,
  messageTypeEnum,
} from './enums';

export const projectApplications = pgTable('project_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull(),
  listingId: uuid('listing_id').notNull(),
  transactionId: text('transaction_id'),
  inviteId: uuid('invite_id'),
  corporateId: uuid('corporate_id'),
  corporateName: text('corporate_name'),
  corporateEmail: text('corporate_email'),
  studentName: text('student_name'),
  studentEmail: text('student_email'),
  listingTitle: text('listing_title'),
  coverLetter: text('cover_letter'),
  resumeAttachmentId: uuid('resume_attachment_id'),
  availabilityDate: text('availability_date'),
  interestReason: text('interest_reason'),
  skills: jsonb('skills').notNull().default([]),
  relevantCoursework: text('relevant_coursework'),
  gpa: text('gpa'),
  hoursPerWeek: integer('hours_per_week'),
  referencesText: text('references_text'),
  initiatedBy: initiatedByTypeEnum('initiated_by')
    .notNull()
    .default('student'),
  invitationMessage: text('invitation_message'),
  rejectionReason: text('rejection_reason'),
  status: applicationStatusEnum('status').notNull().default('pending'),
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerNotes: text('reviewer_notes'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const applicationMessages = pgTable('application_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => projectApplications.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull(),
  senderName: text('sender_name'),
  senderRole: text('sender_role'),
  content: text('content').notNull(),
  messageType: messageTypeEnum('message_type').notNull().default('user'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
