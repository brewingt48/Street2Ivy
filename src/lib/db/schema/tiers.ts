import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  unique,
} from 'drizzle-orm/pg-core';

export const subscriptionTiers = pgTable('subscription_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  sortOrder: integer('sort_order'),
  maxUsers: integer('max_users'),
  maxProjects: integer('max_projects'),
  maxActiveProjects: integer('max_active_projects'),
  aiConfig: jsonb('ai_config'),
  networkConfig: jsonb('network_config'),
  monthlyPriceCents: integer('monthly_price_cents'),
  annualPriceCents: integer('annual_price_cents'),
  features: jsonb('features'),
  brandingConfig: jsonb('branding_config'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantAiOverrides = pgTable(
  'tenant_ai_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    overrideKey: varchar('override_key', { length: 100 }).notNull(),
    overrideValue: jsonb('override_value'),
    reason: text('reason'),
    createdBy: uuid('created_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueTenantOverride: unique().on(table.tenantId, table.overrideKey),
  })
);
