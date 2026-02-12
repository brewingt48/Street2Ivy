#!/usr/bin/env node

/**
 * Migration Script: JSON files + in-memory Maps -> SQLite
 *
 * Reads each existing JSON data file and inserts records into the SQLite
 * database using INSERT OR REPLACE for idempotency.
 *
 * Usage:
 *   node server/scripts/migrate-json-to-sqlite.js
 *
 * Safe to run multiple times — existing rows will be updated, not duplicated.
 */

const fs = require('fs');
const path = require('path');

// Import the db module (this creates the tables on first load)
const db = require('../api-util/db');

const DATA_DIR = path.join(__dirname, '../data');

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  return null;
}

// -------------------------------------------------------------------
// 1. Institutions
// -------------------------------------------------------------------
function migrateInstitutions() {
  const filePath = path.join(DATA_DIR, 'institutions.json');
  const data = readJsonFile(filePath);
  if (!data || !Array.isArray(data)) {
    console.log('  [institutions] No data found or invalid format — skipped');
    return;
  }

  let count = 0;
  for (const inst of data) {
    db.institutions.upsert(inst);
    count++;
  }
  console.log(`  [institutions] Migrated ${count} records`);
}

// -------------------------------------------------------------------
// 2. Blog Posts, Categories, Settings
// -------------------------------------------------------------------
function migrateBlog() {
  const filePath = path.join(DATA_DIR, 'blog-posts.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [blog] No data found — skipped');
    return;
  }

  // Categories
  const categories = data.categories || [];
  for (const cat of categories) {
    db.blogCategories.add(cat);
  }
  console.log(`  [blog_categories] Migrated ${categories.length} categories`);

  // Settings
  const settings = data.settings || {};
  db.blogSettings.setMany(settings);
  console.log(`  [blog_settings] Migrated ${Object.keys(settings).length} settings`);

  // Posts
  const posts = data.posts || [];
  for (const post of posts) {
    // Check if already exists (idempotent)
    const existing = db.blogPosts.getById(post.id);
    if (existing) {
      db.blogPosts.update(post.id, post);
    } else {
      db.blogPosts.create(post);
    }
  }
  console.log(`  [blog_posts] Migrated ${posts.length} posts`);
}

// -------------------------------------------------------------------
// 3. Assessments
// -------------------------------------------------------------------
function migrateAssessments() {
  const filePath = path.join(DATA_DIR, 'assessments.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [assessments] No data found — skipped');
    return;
  }

  const items = data.assessments || [];
  for (const a of items) {
    const existing = db.assessments.getByTransactionId(a.transactionId);
    if (!existing) {
      db.assessments.create(a);
    }
  }
  console.log(`  [assessments] Migrated ${items.length} records`);
}

// -------------------------------------------------------------------
// 4. Blocked Coaching Students
// -------------------------------------------------------------------
function migrateBlockedStudents() {
  const filePath = path.join(DATA_DIR, 'blocked-coaching-students.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [blocked_students] No data found — skipped');
    return;
  }

  const blocked = data.blockedStudents || [];
  for (const entry of blocked) {
    db.blockedStudents.block(entry);
  }
  console.log(`  [blocked_students] Migrated ${blocked.length} records`);
}

// -------------------------------------------------------------------
// 5. Coaching Config
// -------------------------------------------------------------------
function migrateCoachingConfig() {
  const filePath = path.join(DATA_DIR, 'coaching-config.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [coaching_config] No data found — skipped');
    return;
  }

  const entries = {};
  for (const [key, value] of Object.entries(data)) {
    entries[key] = value;
  }
  db.coachingConfig.setMany(entries);
  console.log(`  [coaching_config] Migrated ${Object.keys(entries).length} settings`);
}

// -------------------------------------------------------------------
// 6. Landing Content
// -------------------------------------------------------------------
function migrateLandingContent() {
  const filePath = path.join(DATA_DIR, 'landing-content.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [landing_content] No data found — skipped');
    return;
  }

  db.landingContent.setAll(data);
  console.log(`  [landing_content] Migrated ${Object.keys(data).length} sections`);
}

// -------------------------------------------------------------------
// 7. Tenant Content (per-domain files)
// -------------------------------------------------------------------
function migrateTenantContent() {
  const tenantDir = path.join(DATA_DIR, 'tenant-content');
  if (!fs.existsSync(tenantDir)) {
    console.log('  [tenant_content] No tenant-content directory — skipped');
    return;
  }

  const files = fs.readdirSync(tenantDir).filter(f => f.endsWith('.json'));
  let count = 0;
  for (const file of files) {
    const domain = file.replace('.json', '');
    const content = readJsonFile(path.join(tenantDir, file));
    if (content) {
      db.tenantContent.set(domain, content, content.updatedBy || null);
      count++;
    }
  }
  console.log(`  [tenant_content] Migrated ${count} tenant files`);
}

// -------------------------------------------------------------------
// 8. Tenants
// -------------------------------------------------------------------
function migrateTenants() {
  const filePath = path.join(DATA_DIR, 'tenants.json');
  const data = readJsonFile(filePath);
  if (!data || !Array.isArray(data)) {
    console.log('  [tenants] No data found or invalid format — skipped');
    return;
  }

  for (const t of data) {
    db.tenants.upsert(t);
  }
  console.log(`  [tenants] Migrated ${data.length} records`);
}

// -------------------------------------------------------------------
// 9. Student Waitlist
// -------------------------------------------------------------------
function migrateStudentWaitlist() {
  const filePath = path.join(DATA_DIR, 'student-waitlist.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [student_waitlist] No data found — skipped');
    return;
  }

  const entries = data.entries || [];
  for (const entry of entries) {
    const existing = db.waitlist.getById(entry.id);
    if (!existing) {
      db.waitlist.create(entry);
    }
  }
  console.log(`  [student_waitlist] Migrated ${entries.length} records`);
}

// -------------------------------------------------------------------
// 10. Educational Admin Applications
// -------------------------------------------------------------------
function migrateEduAdminApplications() {
  const filePath = path.join(DATA_DIR, 'educational-admin-applications.json');
  const data = readJsonFile(filePath);
  if (!data || !Array.isArray(data)) {
    console.log('  [edu_admin_applications] No data found or invalid format — skipped');
    return;
  }

  for (const app of data) {
    const existing = db.eduAdminApplications.getById(app.id);
    if (!existing) {
      db.eduAdminApplications.create(app);
    }
  }
  console.log(`  [edu_admin_applications] Migrated ${data.length} records`);
}

// -------------------------------------------------------------------
// 11. Education Messages
// -------------------------------------------------------------------
function migrateEducationMessages() {
  const filePath = path.join(DATA_DIR, 'education-messages.json');
  const data = readJsonFile(filePath);
  if (!data || !Array.isArray(data)) {
    console.log('  [education_messages] No data found or invalid format — skipped');
    return;
  }

  for (const msg of data) {
    try {
      db.educationMessages.create(msg);
    } catch {
      // Duplicate - skip (idempotent)
    }
  }
  console.log(`  [education_messages] Migrated ${data.length} records`);
}

// -------------------------------------------------------------------
// 12. Attachments Metadata
// -------------------------------------------------------------------
function migrateAttachments() {
  const filePath = path.join(DATA_DIR, 'attachments-meta.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [attachments] No data found — skipped');
    return;
  }

  const items = data.attachments || {};
  let count = 0;
  for (const [id, attachment] of Object.entries(items)) {
    const existing = db.attachments.getById(id);
    if (!existing) {
      db.attachments.create(attachment);
      count++;
    }
  }
  console.log(`  [attachments] Migrated ${count} records`);
}

// -------------------------------------------------------------------
// 13. Admin Messages
// -------------------------------------------------------------------
function migrateAdminMessages() {
  const filePath = path.join(DATA_DIR, 'admin-messages.json');
  const data = readJsonFile(filePath);
  if (!data) {
    console.log('  [admin_messages] No data found — skipped');
    return;
  }

  const messages = data.messages || [];
  for (const msg of messages) {
    try {
      db.adminMessages.create(msg);
    } catch {
      // Duplicate - skip (idempotent)
    }
  }
  console.log(`  [admin_messages] Migrated ${messages.length} records`);
}

// -------------------------------------------------------------------
// Run all migrations
// -------------------------------------------------------------------
function runMigration() {
  console.log('=== Campus2Career: JSON -> SQLite Migration ===\n');
  console.log(`Database: ${path.join(DATA_DIR, 'campus2career.db')}\n`);

  const start = Date.now();

  // Wrap everything in a transaction for atomicity
  const migrate = db.transaction(() => {
    migrateInstitutions();
    migrateBlog();
    migrateAssessments();
    migrateBlockedStudents();
    migrateCoachingConfig();
    migrateLandingContent();
    migrateTenantContent();
    migrateTenants();
    migrateStudentWaitlist();
    migrateEduAdminApplications();
    migrateEducationMessages();
    migrateAttachments();
    migrateAdminMessages();
  });

  try {
    migrate();
    const elapsed = Date.now() - start;
    console.log(`\n=== Migration completed successfully in ${elapsed}ms ===`);
  } catch (error) {
    console.error('\n=== Migration FAILED (transaction rolled back) ===');
    console.error(error);
    process.exit(1);
  }
}

runMigration();
