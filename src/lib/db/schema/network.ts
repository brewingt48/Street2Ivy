import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  varchar,
  date,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';
import { skills } from './skills';
import { applicationStatusEnum } from './enums';

// ── Enums ──────────────────────────────────────────────────────────────────────

export const networkPartnerStatusEnum = pgEnum('network_partner_status', [
  'pending',
  'active',
  'suspended',
  'inactive',
]);

export const partnerVisibilityEnum = pgEnum('partner_visibility', [
  'network',
  'private',
  'hybrid',
]);

export const tenantPartnerRelationshipEnum = pgEnum('tenant_partner_relationship', [
  'exclusive',
  'preferred',
  'network',
]);

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'closed',
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

/**
 * network_partners — Corporate / alumni organisations that post projects
 * across the shared network.
 */
export const networkPartners = pgTable('network_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkedUserId: uuid('linked_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  type: text('type').notNull(), // CHECK: 'corporate' | 'alumni' | 'nonprofit' | 'government'
  industry: varchar('industry', { length: 255 }),
  website: text('website'),
  logoUrl: text('logo_url'),
  description: text('description'),
  companySize: varchar('company_size', { length: 50 }),
  headquarters: varchar('headquarters', { length: 255 }),
  isAlumniPartner: boolean('is_alumni_partner').notNull().default(false),
  alumniInstitution: varchar('alumni_institution', { length: 255 }),
  alumniSport: varchar('alumni_sport', { length: 100 }),
  alumniGraduationYear: integer('alumni_graduation_year'),
  alumniPosition: varchar('alumni_position', { length: 100 }),
  alumniYearsOnTeam: integer('alumni_years_on_team'),
  status: networkPartnerStatusEnum('status').notNull().default('pending'),
  visibility: partnerVisibilityEnum('visibility').notNull().default('network'),
  verified: boolean('verified').notNull().default(false),
  featured: boolean('featured').notNull().default(false),
  primaryContactName: varchar('primary_contact_name', { length: 255 }),
  primaryContactEmail: varchar('primary_contact_email', { length: 255 }),
  primaryContactPhone: varchar('primary_contact_phone', { length: 50 }),
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionStatus: varchar('subscription_status', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * network_partner_users — Individual users who belong to a network partner org.
 */
export const networkPartnerUsers = pgTable(
  'network_partner_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    networkPartnerId: uuid('network_partner_id')
      .notNull()
      .references(() => networkPartners.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash'),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    title: varchar('title', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: text('avatar_url'),
    role: text('role').notNull().default('member'), // CHECK: 'owner' | 'admin' | 'member'
    isAlumni: boolean('is_alumni').notNull().default(false),
    alumniBio: text('alumni_bio'),
    alumniInstitution: varchar('alumni_institution', { length: 255 }),
    alumniSport: varchar('alumni_sport', { length: 100 }),
    alumniGraduationYear: integer('alumni_graduation_year'),
    alumniPosition: varchar('alumni_position', { length: 100 }),
    linkedinUrl: text('linkedin_url'),
    status: text('status').notNull().default('active'), // CHECK: 'active' | 'inactive' | 'suspended'
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniquePartnerEmail: unique().on(table.networkPartnerId, table.email),
  })
);

/**
 * tenant_partner_access — Join table linking tenants to network partners they
 * have invited / approved.
 */
export const tenantPartnerAccess = pgTable(
  'tenant_partner_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    networkPartnerId: uuid('network_partner_id')
      .notNull()
      .references(() => networkPartners.id, { onDelete: 'cascade' }),
    relationship: tenantPartnerRelationshipEnum('relationship')
      .notNull()
      .default('network'),
    invitedBy: uuid('invited_by'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    customDisplayName: varchar('custom_display_name', { length: 255 }),
    customDescription: text('custom_description'),
    featuredInTenant: boolean('featured_in_tenant').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueTenantPartner: unique().on(table.tenantId, table.networkPartnerId),
  })
);

/**
 * network_listings — Projects / opportunities posted by network partners.
 */
export const networkListings = pgTable('network_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  networkPartnerId: uuid('network_partner_id')
    .notNull()
    .references(() => networkPartners.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => networkPartnerUsers.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  scopeOfWork: text('scope_of_work'),
  deliverables: text('deliverables'),
  category: varchar('category', { length: 100 }),
  budgetMin: numeric('budget_min'),
  budgetMax: numeric('budget_max'),
  paymentType: text('payment_type'), // CHECK: 'fixed' | 'hourly' | 'stipend' | 'unpaid'
  isPaid: boolean('is_paid').notNull().default(true),
  estimatedHours: integer('estimated_hours'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  applicationDeadline: date('application_deadline'),
  maxStudents: integer('max_students').notNull().default(1),
  studentsAccepted: integer('students_accepted').notNull().default(0),
  status: projectStatusEnum('status').notNull().default('draft'),
  visibility: text('visibility').notNull().default('network'), // CHECK: 'network' | 'targeted' | 'private'
  targetInstitutions: text('target_institutions').array(),
  targetSports: text('target_sports').array(),
  targetGraduationYears: integer('target_graduation_years').array(),
  remoteOk: boolean('remote_ok').notNull().default(false),
  location: varchar('location', { length: 255 }),
  isAlumniProject: boolean('is_alumni_project').notNull().default(false),
  alumniMessage: text('alumni_message'),
  isFeatured: boolean('is_featured').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * network_listing_skills — Skills required for a network listing.
 */
export const networkListingSkills = pgTable(
  'network_listing_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    networkListingId: uuid('network_listing_id')
      .notNull()
      .references(() => networkListings.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    importance: text('importance').notNull().default('preferred'), // CHECK: 'required' | 'preferred' | 'nice_to_have'
    minProficiency: integer('min_proficiency').notNull().default(1), // CHECK: 1–5
  },
  (table) => ({
    uniqueListingSkill: unique().on(table.networkListingId, table.skillId),
  })
);

/**
 * network_listing_targets — Which tenants a network listing is targeted to.
 */
export const networkListingTargets = pgTable(
  'network_listing_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    networkListingId: uuid('network_listing_id')
      .notNull()
      .references(() => networkListings.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    uniqueListingTenant: unique().on(table.networkListingId, table.tenantId),
  })
);

/**
 * network_applications — Student applications to network listings.
 */
export const networkApplications = pgTable(
  'network_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    networkListingId: uuid('network_listing_id')
      .notNull()
      .references(() => networkListings.id, { onDelete: 'cascade' }),
    studentUserId: uuid('student_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: applicationStatusEnum('status').notNull().default('pending'),
    coverLetter: text('cover_letter'),
    proposedApproach: text('proposed_approach'),
    availabilityNote: text('availability_note'),
    matchScore: numeric('match_score', { precision: 5, scale: 2 }),
    skillsMatchScore: numeric('skills_match_score', { precision: 5, scale: 2 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => networkPartnerUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueApplication: unique().on(
      table.tenantId,
      table.networkListingId,
      table.studentUserId
    ),
  })
);
