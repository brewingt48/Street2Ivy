import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const handshakeIntegrations = pgTable('handshake_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }).unique(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  apiBaseUrl: text('api_base_url').notNull().default('https://edu-api.joinhandshake.com/v1'),
  isActive: boolean('is_active').notNull().default(false),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: text('last_sync_status').default('never_synced'),
  lastSyncError: text('last_sync_error'),
  syncFrequency: text('sync_frequency').notNull().default('weekly'),
  dataPermissions: jsonb('data_permissions').$type<{ jobs: boolean; applications: boolean; students: boolean; fairs: boolean }>().notNull().default({ jobs: true, applications: false, students: false, fairs: false }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
