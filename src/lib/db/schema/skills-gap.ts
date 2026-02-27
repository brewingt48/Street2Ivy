import { pgTable, uuid, text, numeric, integer, date, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { skills } from './skills';
import { tenants } from './tenants';
import { users } from './users';

export const targetRoles = pgTable('target_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').default(''),
  institutionId: uuid('institution_id').references(() => tenants.id, { onDelete: 'set null' }),
  source: text('source').notNull().default('manual'),
  sourceReferenceId: text('source_reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roleSkillRequirements = pgTable('role_skill_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetRoleId: uuid('target_role_id').notNull().references(() => targetRoles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  importance: text('importance').notNull().default('required'),
  minimumProficiency: integer('minimum_proficiency').notNull().default(2),
  frequencyInPostings: numeric('frequency_in_postings', { precision: 4, scale: 3 }),
  source: text('source').notNull().default('manual'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueRoleSkill: unique().on(table.targetRoleId, table.skillId),
}));

export const skillGapSnapshots = pgTable('skill_gap_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetRoleId: uuid('target_role_id').notNull().references(() => targetRoles.id, { onDelete: 'cascade' }),
  overallReadinessScore: numeric('overall_readiness_score', { precision: 5, scale: 2 }).notNull().default('0.00'),
  gaps: jsonb('gaps').$type<Array<{ skillId: string; requiredLevel: number; currentLevel: number; gapSeverity: string; recommendedProjects: string[] }>>().notNull().default([]),
  strengths: jsonb('strengths').$type<Array<{ skillId: string; verifiedLevel: number; exceedsBy: number }>>().notNull().default([]),
  snapshotDate: date('snapshot_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
