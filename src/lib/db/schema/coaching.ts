import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
  date,
  numeric,
  unique,
} from 'drizzle-orm/pg-core';

export const coachingConfig = pgTable('coaching_config', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blockedCoachingStudents = pgTable('blocked_coaching_students', {
  userId: uuid('user_id').primaryKey(),
  reason: text('reason').notNull().default(''),
  blockedAt: timestamp('blocked_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  blockedBy: uuid('blocked_by'),
});

// AI Usage Counters (per tenant, per month)
export const aiUsageCounters = pgTable('ai_usage_counters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  monthKey: text('month_key').notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// AI Conversation History
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id'),
  title: text('title').notNull().default('New Conversation'),
  contextType: text('context_type').notNull().default('coaching'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// AI Conversation Messages
export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// AI Usage Counters V2 (per tenant, per user, per feature, per month)
export const aiUsageCountersV2 = pgTable(
  'ai_usage_counters_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    feature: varchar('feature', { length: 50 }).notNull(),
    month: date('month').notNull(),
    interactionCount: integer('interaction_count').notNull().default(0),
  },
  (table) => ({
    uniqueUsage: unique().on(
      table.tenantId,
      table.userId,
      table.feature,
      table.month
    ),
  })
);

// Portfolio Intelligence Reports
export const portfolioIntelligenceReports = pgTable(
  'portfolio_intelligence_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    studentUserId: uuid('student_user_id').notNull(),
    careerNarrative: text('career_narrative'),
    skillsProgression: jsonb('skills_progression'),
    strengthsSummary: jsonb('strengths_summary'),
    projectsAnalyzed: integer('projects_analyzed'),
    reviewsAnalyzed: integer('reviews_analyzed'),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    modelUsed: varchar('model_used', { length: 100 }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: numeric('cost_usd'),
  }
);

// Talent Insight Reports
export const talentInsightReports = pgTable('talent_insight_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  listingId: uuid('listing_id').notNull(),
  corporateUserId: uuid('corporate_user_id').notNull(),
  teamPerformance: text('team_performance'),
  standoutContributors: jsonb('standout_contributors'),
  hiringRecommendations: jsonb('hiring_recommendations'),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  modelUsed: varchar('model_used', { length: 100 }),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd: numeric('cost_usd'),
});

// Institutional Analytics Reports
export const institutionalAnalyticsReports = pgTable(
  'institutional_analytics_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    reportingPeriodStart: date('reporting_period_start').notNull(),
    reportingPeriodEnd: date('reporting_period_end').notNull(),
    engagementSummary: text('engagement_summary'),
    skillGapAnalysis: jsonb('skill_gap_analysis'),
    curriculumRecommendations: jsonb('curriculum_recommendations'),
    studentSuccessPatterns: text('student_success_patterns'),
    platformBenchmark: jsonb('platform_benchmark'),
    totalStudents: integer('total_students'),
    totalProjects: integer('total_projects'),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    modelUsed: varchar('model_used', { length: 100 }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: numeric('cost_usd'),
  }
);
