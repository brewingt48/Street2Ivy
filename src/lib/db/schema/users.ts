import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { institutions } from './institutions';
import { tenants } from './tenants';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  // IMPORTANT: display_name is GENERATED ALWAYS — read-only, never include in INSERT/UPDATE
  displayName: text('display_name'),
  role: userRoleEnum('role').notNull().default('student'),
  emailVerified: boolean('email_verified').notNull().default(false),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  bio: text('bio').default(''),
  university: text('university'),
  major: text('major'),
  graduationYear: integer('graduation_year'),
  gpa: text('gpa'),
  companyName: text('company_name'),
  jobTitle: text('job_title'),
  department: text('department'),
  institutionDomain: text('institution_domain').references(
    () => institutions.domain,
    { onDelete: 'set null' }
  ),
  tenantId: uuid('tenant_id').references(() => tenants.id, {
    onDelete: 'set null',
  }),
  publicData: jsonb('public_data').notNull().default({}),
  privateData: jsonb('private_data').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
