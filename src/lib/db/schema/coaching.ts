import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const coachingConfig = pgTable('coaching_config', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blockedCoachingStudents = pgTable('blocked_coaching_students', {
  userId: uuid('user_id').primaryKey(),
  reason: text('reason').notNull().default(''),
  blockedAt: timestamp('blocked_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  blockedBy: uuid('blocked_by'),
});
