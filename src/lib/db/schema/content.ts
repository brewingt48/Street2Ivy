import { pgTable, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { institutions } from './institutions';

export const landingContent = pgTable('landing_content', {
  section: text('section').primaryKey(),
  content: jsonb('content').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid('updated_by'),
});

export const tenantContent = pgTable('tenant_content', {
  domain: text('domain')
    .primaryKey()
    .references(() => institutions.domain, { onDelete: 'cascade' }),
  content: jsonb('content').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid('updated_by'),
});
