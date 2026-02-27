/**
 * ProveGround Match Engine™ — Drizzle Schema
 *
 * Tables for the proprietary bi-directional schedule-aware matching algorithm.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';
import { listings } from './listings';

// ============================================================================
// Sport Seasons
// ============================================================================
export const sportSeasons = pgTable('sport_seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  sportName: text('sport_name').notNull(),
  seasonType: text('season_type').notNull().default('regular'),
  startMonth: integer('start_month').notNull(),
  endMonth: integer('end_month').notNull(),
  practiceHoursPerWeek: numeric('practice_hours_per_week', { precision: 4, scale: 1 })
    .notNull()
    .default('20'),
  competitionHoursPerWeek: numeric('competition_hours_per_week', { precision: 4, scale: 1 })
    .notNull()
    .default('5'),
  travelDaysPerMonth: integer('travel_days_per_month').notNull().default(2),
  intensityLevel: integer('intensity_level').notNull().default(3),
  division: text('division').default('D1'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Academic Calendars
// ============================================================================
export const academicCalendars = pgTable('academic_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  termName: text('term_name').notNull(),
  termType: text('term_type').notNull().default('semester'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isBreak: boolean('is_break').notNull().default(false),
  priorityLevel: integer('priority_level').notNull().default(3),
  academicYear: text('academic_year'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Student Schedules
// ============================================================================
export const studentSchedules = pgTable('student_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sportSeasonId: uuid('sport_season_id').references(() => sportSeasons.id, {
    onDelete: 'set null',
  }),
  academicCalendarId: uuid('academic_calendar_id').references(() => academicCalendars.id, {
    onDelete: 'set null',
  }),
  scheduleType: text('schedule_type').notNull().default('sport'),
  customBlocks: jsonb('custom_blocks').notNull().default([]),
  availableHoursPerWeek: numeric('available_hours_per_week', { precision: 4, scale: 1 }),
  travelConflicts: jsonb('travel_conflicts').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  effectiveStart: date('effective_start'),
  effectiveEnd: date('effective_end'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Athletic Skill Mappings
// ============================================================================
export const athleticSkillMappings = pgTable('athletic_skill_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sportName: text('sport_name').notNull(),
  position: text('position'),
  professionalSkill: text('professional_skill').notNull(),
  transferStrength: numeric('transfer_strength', { precision: 3, scale: 2 })
    .notNull()
    .default('0.50'),
  skillCategory: text('skill_category').notNull().default('General'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Match Scores — cached composite match scores
// ============================================================================
export const matchScores = pgTable(
  'match_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    compositeScore: numeric('composite_score', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    signalBreakdown: jsonb('signal_breakdown').notNull().default({}),
    isStale: boolean('is_stale').notNull().default(false),
    computationTimeMs: integer('computation_time_ms'),
    version: integer('version').notNull().default(1),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentListingIdx: uniqueIndex('idx_match_scores_student_listing').on(
      table.studentId,
      table.listingId
    ),
    listingIdx: index('idx_match_scores_listing').on(table.listingId),
    tenantIdx: index('idx_match_scores_tenant').on(table.tenantId),
  })
);

// ============================================================================
// Match Score History — audit trail
// ============================================================================
export const matchScoreHistory = pgTable('match_score_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchScoreId: uuid('match_score_id')
    .notNull()
    .references(() => matchScores.id, { onDelete: 'cascade' }),
  oldScore: numeric('old_score', { precision: 5, scale: 2 }),
  newScore: numeric('new_score', { precision: 5, scale: 2 }).notNull(),
  oldBreakdown: jsonb('old_breakdown'),
  newBreakdown: jsonb('new_breakdown').notNull().default({}),
  changeReason: text('change_reason'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Corporate Attractiveness Scores — reverse direction
// ============================================================================
export const corporateAttractivenessScores = pgTable('corporate_attractiveness_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  attractivenessScore: numeric('attractiveness_score', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  signalBreakdown: jsonb('signal_breakdown').notNull().default({}),
  sampleSize: integer('sample_size').notNull().default(0),
  isStale: boolean('is_stale').notNull().default(false),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Match Engine Config — per-tenant weight overrides
// ============================================================================
export const matchEngineConfig = pgTable('match_engine_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  signalWeights: jsonb('signal_weights').notNull().default({
    temporal: 0.25,
    skills: 0.30,
    sustainability: 0.15,
    growth: 0.10,
    trust: 0.10,
    network: 0.10,
  }),
  minScoreThreshold: numeric('min_score_threshold', { precision: 5, scale: 2 })
    .notNull()
    .default('20.00'),
  maxResultsPerQuery: integer('max_results_per_query').notNull().default(50),
  enableAthleticTransfer: boolean('enable_athletic_transfer').notNull().default(true),
  enableScheduleMatching: boolean('enable_schedule_matching').notNull().default(true),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Match Feedback
// ============================================================================
export const matchFeedback = pgTable('match_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchScoreId: uuid('match_score_id').references(() => matchScores.id, {
    onDelete: 'set null',
  }),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  feedbackType: text('feedback_type').notNull().default('relevance'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Recomputation Queue
// ============================================================================
export const recomputationQueue = pgTable('recomputation_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull().default('manual'),
  priority: integer('priority').notNull().default(5),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
});
