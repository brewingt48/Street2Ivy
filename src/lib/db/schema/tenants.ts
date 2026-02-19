import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  varchar,
} from 'drizzle-orm/pg-core';
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
  subscriptionTierId: uuid('subscription_tier_id'),

  // ── Network / marketplace columns ──────────────────────────────────────────
  sharedNetworkEnabled: boolean('shared_network_enabled').notNull().default(false),
  networkTier: varchar('network_tier', { length: 50 }).default('basic'),
  maxNetworkApplicationsPerMonth: integer('max_network_applications_per_month').default(20),
  networkPartnerLimit: integer('network_partner_limit'),
  marketplaceType: varchar('marketplace_type', { length: 50 }).default('institution'),

  // ── Branding / hero / gallery columns ──────────────────────────────────────
  sport: varchar('sport', { length: 100 }),
  teamName: varchar('team_name', { length: 255 }),
  conference: varchar('conference', { length: 255 }),
  mascotUrl: text('mascot_url'),
  heroVideoUrl: text('hero_video_url'),
  heroVideoPosterUrl: text('hero_video_poster_url'),
  heroHeadline: text('hero_headline'),
  heroSubheadline: text('hero_subheadline'),
  galleryImages: jsonb('gallery_images').default([]),
  socialLinks: jsonb('social_links').default({}),
  aboutContent: text('about_content'),
  contactInfo: jsonb('contact_info').default({}),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
