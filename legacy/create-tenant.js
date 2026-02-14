#!/usr/bin/env node
/**
 * Street2Ivy — Create First Tenant
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected. Creating tenant...\n');

    // Create the first tenant
    const result = await client.query(`
      SELECT create_tenant(
        'Street2Ivy',
        'street2ivy',
        'tavares@street2ivy.com',
        'enterprise',
        'Street2Ivy Marketplace',
        NULL
      ) AS tenant_id;
    `);

    const tenantId = result.rows[0].tenant_id;
    console.log(`✅ Tenant created!`);
    console.log(`   Tenant ID: ${tenantId}\n`);

    // Verify tenant
    const tenant = await client.query('SELECT * FROM tenants;');
    console.log('=== TENANTS ===');
    tenant.rows.forEach(r => {
      console.log(`  ID: ${r.id}`);
      console.log(`  Name: ${r.name}`);
      console.log(`  Subdomain: ${r.subdomain}`);
      console.log(`  Display Name: ${r.display_name}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Plan: ${r.features?.plan || 'N/A'}`);
      console.log(`  Created: ${r.created_at}`);
    });

    // Verify admin user
    console.log('\n=== ADMIN USERS ===');
    const admins = await client.query("SELECT * FROM users WHERE role = 'admin';");
    admins.rows.forEach(r => {
      console.log(`  ID: ${r.id}`);
      console.log(`  Email: ${r.email}`);
      console.log(`  Name: ${r.display_name}`);
      console.log(`  Role: ${r.role}`);
      console.log(`  Tenant: ${r.tenant_id}`);
      console.log(`  Verified: ${r.email_verified}`);
    });

    // Verify skills seed data
    const skillCount = await client.query('SELECT count(*) AS cnt FROM skills;');
    console.log(`\n=== SKILLS ===`);
    console.log(`  Total skills loaded: ${skillCount.rows[0].cnt}`);

    const categories = await client.query('SELECT category, count(*) AS cnt FROM skills GROUP BY category ORDER BY category;');
    categories.rows.forEach(r => {
      console.log(`  ${r.category}: ${r.cnt}`);
    });

    // Verify tenant_usage function
    console.log('\n=== TENANT USAGE ===');
    const usage = await client.query('SELECT * FROM tenant_usage($1);', [tenantId]);
    usage.rows.forEach(r => {
      console.log(`  ${r.metric}: ${r.current_val} / ${r.max_val > 0 ? r.max_val : '∞'} (${r.usage_pct}%)`);
    });

    // List all tables
    console.log('\n=== ALL TABLES ===');
    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    tables.rows.forEach(r => {
      console.log(`  ${r.tablename}`);
    });

    // Verify blog categories
    const blogCats = await client.query('SELECT * FROM blog_categories ORDER BY name;');
    console.log(`\n=== BLOG CATEGORIES (${blogCats.rows.length}) ===`);
    blogCats.rows.forEach(r => console.log(`  ${r.name}`));

    // Verify coaching config
    const coaching = await client.query('SELECT * FROM coaching_config;');
    console.log(`\n=== COACHING CONFIG (${coaching.rows.length} keys) ===`);
    coaching.rows.forEach(r => console.log(`  ${r.key}: ${r.value?.substring(0, 60)}${r.value?.length > 60 ? '...' : ''}`));

    // Verify landing content
    const landing = await client.query('SELECT section FROM landing_content ORDER BY section;');
    console.log(`\n=== LANDING CONTENT SECTIONS (${landing.rows.length}) ===`);
    landing.rows.forEach(r => console.log(`  ${r.section}`));

    // Verify audit log
    const audit = await client.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;');
    console.log(`\n=== AUDIT LOG (${audit.rows.length} entries) ===`);
    audit.rows.forEach(r => {
      console.log(`  ${r.action} on ${r.resource} (${r.resource_id}) at ${r.created_at}`);
    });

    // Output for .env
    console.log('\n========================================');
    console.log('SAVE THESE VALUES:');
    console.log(`TENANT_ID=${tenantId}`);
    console.log('========================================');

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
