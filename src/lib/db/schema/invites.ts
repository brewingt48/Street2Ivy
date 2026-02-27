import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { inviteStatusEnum } from './enums';

export const corporateInvites = pgTable('corporate_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  corporatePartnerId: uuid('corporate_partner_id').notNull(),
  studentId: uuid('student_id').notNull(),
  studentName: text('student_name'),
  studentEmail: text('student_email'),
  studentUniversity: text('student_university'),
  listingId: uuid('listing_id'),
  projectTitle: text('project_title'),
  message: text('message').notNull().default(''),
  transactionId: text('transaction_id'),
  status: inviteStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});
