import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenantStatusEnum } from './enums';
import { institutions } from './institutions';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  subdomain: text('subdomain').unique().notNull(),
  name: text('name').notNull(),
  displayName: text('display_name'),
  status: tenantStatusEnum('status').notNull().default('active'),
  sharetrbeConfig: jsonb('sharetribe_config').default({}),
  branding: jsonb('branding').default({}),
  institutionDomain: text('institution_domain').references(
    () => institutions.domain,
    { onDelete: 'set null' }
  ),
  corporatePartnerIds: jsonb('corporate_partner_ids').notNull().default([]),
  features: jsonb('features').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
