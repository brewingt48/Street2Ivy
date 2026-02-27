import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { messageSeverityEnum } from './enums';

export const directMessages = pgTable('direct_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: text('thread_id').notNull(),
  senderId: uuid('sender_id').notNull(),
  senderName: text('sender_name'),
  senderType: text('sender_type'),
  recipientId: uuid('recipient_id').notNull(),
  recipientName: text('recipient_name'),
  recipientType: text('recipient_type'),
  subject: text('subject'),
  content: text('content').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const educationMessages = pgTable('education_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').notNull(),
  senderName: text('sender_name'),
  senderType: text('sender_type'),
  senderInstitution: text('sender_institution'),
  recipientType: text('recipient_type'),
  recipientId: uuid('recipient_id').notNull(),
  recipientName: text('recipient_name'),
  subject: text('subject'),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  isRead: boolean('is_read').notNull().default(false),
});

export const adminMessages = pgTable('admin_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').notNull(),
  senderName: text('sender_name'),
  recipientId: uuid('recipient_id').notNull(),
  recipientType: text('recipient_type'),
  recipientName: text('recipient_name'),
  recipientInstitution: text('recipient_institution'),
  recipientUniversity: text('recipient_university'),
  subject: text('subject'),
  content: text('content').notNull(),
  student: jsonb('student').default({}),
  severity: messageSeverityEnum('severity').notNull().default('info'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
