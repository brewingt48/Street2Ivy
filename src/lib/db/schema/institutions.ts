import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { membershipStatusEnum } from './enums';

export const institutions = pgTable('institutions', {
  domain: text('domain').primaryKey(),
  name: text('name').notNull(),
  membershipStatus: membershipStatusEnum('membership_status')
    .notNull()
    .default('pending'),
  membershipStartDate: timestamp('membership_start_date', {
    withTimezone: true,
  }),
  membershipEndDate: timestamp('membership_end_date', { withTimezone: true }),
  aiCoachingEnabled: boolean('ai_coaching_enabled').notNull().default(false),
  aiCoachingUrl: text('ai_coaching_url').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
