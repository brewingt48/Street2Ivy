/**
 * Production Database Migration Script
 *
 * Applies the complete schema to the production database.
 * Run with: node scripts/migrate-production.mjs
 *
 * Requires DATABASE_URL environment variable.
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 30,
  connect_timeout: 30,
});

async function runSqlFile(filepath, label) {
  console.log(`\n=== Applying: ${label} ===`);
  const content = readFileSync(filepath, 'utf8');
  try {
    await sql.unsafe(content);
    console.log(`✅ ${label} applied successfully`);
  } catch (err) {
    // Some errors are expected (e.g., types/tables already exist)
    if (err.code === '42710' || err.code === '42P07') {
      console.log(`⚠️  ${label}: Some objects already exist (safe to ignore)`);
    } else {
      console.error(`❌ ${label} failed:`, err.message);
      throw err;
    }
  }
}

async function runSql(content, label) {
  console.log(`\n=== Applying: ${label} ===`);
  try {
    await sql.unsafe(content);
    console.log(`✅ ${label} applied successfully`);
  } catch (err) {
    if (err.code === '42710' || err.code === '42P07') {
      console.log(`⚠️  ${label}: Some objects already exist (safe to ignore)`);
    } else {
      console.error(`❌ ${label} failed:`, err.message);
      throw err;
    }
  }
}

async function main() {
  console.log('🚀 Starting production database migration...\n');

  // Verify connection
  const result = await sql`SELECT current_database(), current_user`;
  console.log(`Connected to: ${result[0].current_database} as ${result[0].current_user}`);

  // Check if database is empty
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log(`Existing tables: ${tables.length}`);

  if (tables.length > 0) {
    console.log('Tables found:', tables.map(t => t.tablename).join(', '));
    console.log('\n⚠️  Database is not empty. This script is designed for initial setup.');
    console.log('Proceeding anyway (using IF NOT EXISTS where possible)...');
  }

  // Step 1: Base schema
  await runSqlFile(join(ROOT, 'street2ivy_schema.sql'), 'Base Schema');

  // Step 2: Migrations in order
  const migrations = [
    '004_shared_network.sql',
    '005_listing_type.sql',
    '005_holy_cross_seed.sql',
    '006_match_engine.sql',
    '007_match_engine_seed.sql',
    '008_holy_cross_match_engine.sql',
    '009_legal_policies.sql',
    '010_listing_visibility.sql',
    '011_team_huddle.sql',
    '012_huddle_branding.sql',
  ];

  for (const migration of migrations) {
    await runSqlFile(join(ROOT, 'migrations', migration), migration);
  }

  // Step 3: Additional tables from Drizzle schema not in SQL files
  const additionalTables = `
    -- AI Usage Counters (legacy per-tenant)
    CREATE TABLE IF NOT EXISTS ai_usage_counters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      month_key TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, month_key)
    );

    -- AI Conversations
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      tenant_id UUID,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      context_type TEXT NOT NULL DEFAULT 'coaching',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- AI Messages
    CREATE TABLE IF NOT EXISTS ai_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- AI Usage Counters V2 (per-user, per-feature)
    CREATE TABLE IF NOT EXISTS ai_usage_counters_v2 (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      user_id UUID NOT NULL,
      feature VARCHAR(50) NOT NULL,
      month DATE NOT NULL,
      interaction_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(tenant_id, user_id, feature, month)
    );

    -- Subscription Tiers
    CREATE TABLE IF NOT EXISTS subscription_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100),
      sort_order INTEGER,
      max_users INTEGER,
      max_projects INTEGER,
      max_active_projects INTEGER,
      ai_config JSONB,
      network_config JSONB,
      monthly_price_cents INTEGER,
      annual_price_cents INTEGER,
      features JSONB,
      branding_config JSONB,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Tenant AI Overrides
    CREATE TABLE IF NOT EXISTS tenant_ai_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      override_key VARCHAR(100) NOT NULL,
      override_value JSONB,
      reason TEXT,
      created_by UUID,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, override_key)
    );

    -- Portfolio Intelligence Reports
    CREATE TABLE IF NOT EXISTS portfolio_intelligence_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      student_user_id UUID NOT NULL,
      career_narrative TEXT,
      skills_progression JSONB,
      strengths_summary JSONB,
      projects_analyzed INTEGER,
      reviews_analyzed INTEGER,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model_used VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd NUMERIC
    );

    -- Talent Insight Reports
    CREATE TABLE IF NOT EXISTS talent_insight_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      listing_id UUID NOT NULL,
      corporate_user_id UUID NOT NULL,
      team_performance TEXT,
      standout_contributors JSONB,
      hiring_recommendations JSONB,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model_used VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd NUMERIC
    );

    -- Institutional Analytics Reports
    CREATE TABLE IF NOT EXISTS institutional_analytics_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      reporting_period_start DATE NOT NULL,
      reporting_period_end DATE NOT NULL,
      engagement_summary TEXT,
      skill_gap_analysis JSONB,
      curriculum_recommendations JSONB,
      student_success_patterns TEXT,
      platform_benchmark JSONB,
      total_students INTEGER,
      total_projects INTEGER,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model_used VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd NUMERIC
    );

    -- Issue Reports
    CREATE TABLE IF NOT EXISTS issue_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL,
      tenant_id UUID,
      category TEXT NOT NULL DEFAULT 'general',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      admin_notes TEXT,
      resolved_at TIMESTAMPTZ,
      resolved_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Onboarding Details
    CREATE TABLE IF NOT EXISTS onboarding_details (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID NOT NULL,
      student_id UUID NOT NULL,
      platform_tour_completed BOOLEAN NOT NULL DEFAULT FALSE,
      nda_signed BOOLEAN NOT NULL DEFAULT FALSE,
      profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
      project_briefing_completed BOOLEAN NOT NULL DEFAULT FALSE,
      welcome_message_read BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create indexes for AI tables
    CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_tenant ON ai_usage_counters(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_v2_tenant_user ON ai_usage_counters_v2(tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_issue_reports_reporter ON issue_reports(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
    CREATE INDEX IF NOT EXISTS idx_onboarding_application ON onboarding_details(application_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_student ON onboarding_details(student_id);
  `;

  await runSql(additionalTables, 'Additional Tables (AI, Tiers, Reports)');

  // Step 4: Verify
  const finalTables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log(`\n✅ Migration complete! Total tables: ${finalTables.length}`);
  console.log('Tables:', finalTables.map(t => t.tablename).join(', '));

  await sql.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n💥 Migration failed:', err.message);
  await sql.end();
  process.exit(1);
});
