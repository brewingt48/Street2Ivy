import { pgTable, uuid, text, numeric, boolean, date, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const outcomeMetrics = pgTable('outcome_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(),
  metricValue: numeric('metric_value').notNull().default('0'),
  metricMetadata: jsonb('metric_metadata').$type<Record<string, unknown>>().notNull().default({}),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  cohortFilter: text('cohort_filter'),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const outcomeReports = pgTable('outcome_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  reportType: text('report_type').notNull().default('custom'),
  filters: jsonb('filters').$type<{ programs?: string[]; cohorts?: string[]; dateRange?: { start: string; end: string }; metrics?: string[] }>().notNull().default({}),
  generatedBy: uuid('generated_by').notNull().references(() => users.id),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  fileUrl: text('file_url'),
  isScheduled: boolean('is_scheduled').notNull().default(false),
  scheduleFrequency: text('schedule_frequency'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
