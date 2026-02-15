import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

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
