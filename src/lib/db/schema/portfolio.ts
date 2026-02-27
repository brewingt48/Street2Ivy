import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { listings } from './listings';

export const studentPortfolios = pgTable('student_portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  slug: text('slug').unique().notNull(),
  displayName: text('display_name').notNull(),
  headline: text('headline'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  theme: text('theme').notNull().default('professional'),
  isPublic: boolean('is_public').notNull().default(true),
  showReadinessScore: boolean('show_readiness_score').notNull().default(true),
  showSkillChart: boolean('show_skill_chart').notNull().default(true),
  customUrl: text('custom_url'),
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioProjects = pgTable('portfolio_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => studentPortfolios.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  displayOrder: integer('display_order').notNull().default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  studentReflection: text('student_reflection'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioBadges = pgTable('portfolio_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeType: text('badge_type').notNull(),
  badgeLabel: text('badge_label').notNull(),
  badgeMetadata: jsonb('badge_metadata').$type<Record<string, unknown>>().notNull().default({}),
  earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioViews = pgTable('portfolio_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => studentPortfolios.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id'),
  viewerType: text('viewer_type').notNull().default('anonymous'),
  referrer: text('referrer'),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
});
