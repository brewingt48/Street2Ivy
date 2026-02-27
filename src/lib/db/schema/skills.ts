import { pgTable, uuid, text, integer, numeric, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { listings } from './listings';
import { verificationSourceEnum } from './enums';

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  category: text('category').notNull().default('General'),
  description: text('description').default(''),
  subcategory: text('subcategory'),
  proficiencyLevels: jsonb('proficiency_levels').$type<string[]>().default(['beginner', 'intermediate', 'advanced', 'expert']),
  aliases: jsonb('aliases').$type<string[]>().default([]),
  demandWeight: numeric('demand_weight', { precision: 4, scale: 3 }).default('0.000'),
  onetCode: text('onet_code'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSkills = pgTable(
  'user_skills',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    proficiencyLevel: integer('proficiency_level').default(3),
    verificationSource: verificationSourceEnum('verification_source').default('self_reported'),
    projectId: uuid('project_id').references(() => listings.id, { onDelete: 'set null' }),
    endorserId: uuid('endorser_id').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    evidenceNotes: text('evidence_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.skillId] }),
  })
);
