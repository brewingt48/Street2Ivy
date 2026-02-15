import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  date,
  numeric,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category'),
  skillsRequired: jsonb('skills_required').notNull().default([]),
  location: text('location'),
  remoteAllowed: boolean('remote_allowed').notNull().default(false),
  compensation: text('compensation'),
  hoursPerWeek: integer('hours_per_week'),
  duration: text('duration'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  maxApplicants: integer('max_applicants'),
  requiresNda: boolean('requires_nda').notNull().default(false),
  status: text('status').notNull().default('draft'),
  publicData: jsonb('public_data').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  applicationDeadline: date('application_deadline'),
  budgetMin: numeric('budget_min'),
  budgetMax: numeric('budget_max'),
  paymentType: text('payment_type'),
  maxStudents: integer('max_students').notNull().default(1),
  studentsAccepted: integer('students_accepted').notNull().default(0),
  isPaid: boolean('is_paid').notNull().default(true),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
