/**
 * SQLite Persistence Layer for Campus2Career
 *
 * Replaces all file-based JSON stores and in-memory Maps with a single
 * SQLite database using better-sqlite3 (synchronous, fast, WAL mode).
 *
 * Usage:
 *   const db = require('./db');
 *   const all = db.institutions.getAll();
 *   db.blogPosts.create({ title: '...', ... });
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'campus2career.db');

// Open the database (creates file if it doesn't exist)
const sqlite = new Database(DB_PATH);

// Enable WAL mode for concurrent reads
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// -------------------------------------------------------------------
// Schema creation
// -------------------------------------------------------------------

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS institutions (
    domain TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    membership_status TEXT DEFAULT 'pending',
    membership_start_date TEXT,
    membership_end_date TEXT,
    ai_coaching_enabled INTEGER DEFAULT 0,
    ai_coaching_url TEXT DEFAULT '',
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT DEFAULT '',
    excerpt TEXT DEFAULT '',
    category TEXT DEFAULT 'News',
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    featured_image TEXT,
    author_id TEXT,
    author_name TEXT,
    created_at TEXT,
    updated_at TEXT,
    updated_by TEXT,
    published_at TEXT,
    view_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS blog_categories (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS blog_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id TEXT UNIQUE,
    transaction_id TEXT,
    student_id TEXT,
    student_name TEXT,
    assessor_id TEXT,
    assessor_name TEXT,
    company_name TEXT,
    project_title TEXT,
    ratings TEXT,
    comments TEXT,
    section_averages TEXT,
    overall_average REAL,
    overall_comments TEXT DEFAULT '',
    strengths TEXT DEFAULT '',
    areas_for_improvement TEXT DEFAULT '',
    recommend_for_future INTEGER DEFAULT 0,
    sent_to_student INTEGER DEFAULT 0,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS blocked_coaching_students (
    user_id TEXT PRIMARY KEY,
    reason TEXT DEFAULT '',
    blocked_at TEXT,
    blocked_by TEXT
  );

  CREATE TABLE IF NOT EXISTS coaching_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS landing_content (
    section TEXT PRIMARY KEY,
    content TEXT,
    updated_at TEXT,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS tenant_content (
    domain TEXT PRIMARY KEY,
    content TEXT,
    updated_at TEXT,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    subdomain TEXT UNIQUE,
    name TEXT NOT NULL,
    display_name TEXT,
    status TEXT DEFAULT 'active',
    sharetribe_config TEXT,
    branding TEXT,
    institution_domain TEXT,
    corporate_partner_ids TEXT DEFAULT '[]',
    features TEXT DEFAULT '{}',
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS student_waitlist (
    id TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    domain TEXT,
    institution_name TEXT,
    created_at TEXT,
    last_attempt_at TEXT,
    attempts INTEGER DEFAULT 1,
    contacted INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    updated_at TEXT,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS edu_admin_applications (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    email_domain TEXT,
    institution_name TEXT,
    institution_website TEXT,
    job_title TEXT,
    department TEXT,
    work_phone TEXT,
    reason TEXT,
    student_count TEXT,
    existing_user_id TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TEXT,
    reviewed_at TEXT,
    reviewed_by TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS education_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    sender_name TEXT,
    sender_type TEXT,
    sender_institution TEXT,
    recipient_type TEXT,
    recipient_id TEXT,
    recipient_name TEXT,
    subject TEXT,
    content TEXT,
    sent_at TEXT,
    received_at TEXT,
    is_read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    original_name TEXT,
    stored_name TEXT,
    mime_type TEXT,
    size INTEGER,
    size_formatted TEXT,
    file_type TEXT,
    extension TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT,
    context_type TEXT,
    context_id TEXT,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS corporate_invites (
    id TEXT PRIMARY KEY,
    corporate_partner_id TEXT,
    student_id TEXT,
    student_name TEXT,
    student_email TEXT,
    student_university TEXT,
    listing_id TEXT,
    project_title TEXT,
    message TEXT DEFAULT '',
    transaction_id TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    responded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS nda_documents (
    listing_id TEXT PRIMARY KEY,
    document_id TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT,
    document_url TEXT,
    document_name TEXT,
    nda_text TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS nda_signature_requests (
    transaction_id TEXT PRIMARY KEY,
    signature_id TEXT,
    listing_id TEXT,
    title TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    completed_at TEXT,
    signers TEXT,
    document_url TEXT,
    nda_text TEXT,
    signed_document_url TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT,
    type TEXT,
    subject TEXT,
    content TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    sender_name TEXT,
    recipient_id TEXT,
    recipient_type TEXT,
    recipient_name TEXT,
    recipient_institution TEXT,
    recipient_university TEXT,
    subject TEXT,
    content TEXT,
    student TEXT,
    severity TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_corporate_invites_partner ON corporate_invites(corporate_partner_id);
  CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
  CREATE INDEX IF NOT EXISTS idx_assessments_transaction ON assessments(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
  CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
  CREATE INDEX IF NOT EXISTS idx_attachments_context ON attachments(context_type, context_id);
  CREATE INDEX IF NOT EXISTS idx_education_messages_sender ON education_messages(sender_id);
  CREATE INDEX IF NOT EXISTS idx_education_messages_recipient ON education_messages(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_student_waitlist_email ON student_waitlist(email);
  CREATE INDEX IF NOT EXISTS idx_edu_admin_applications_email ON edu_admin_applications(email);
  CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON admin_messages(sender_id);
  CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient ON admin_messages(recipient_id);
`);

// -------------------------------------------------------------------
// JSON helpers
// -------------------------------------------------------------------

function jsonParse(val, fallback) {
  if (val === null || val === undefined) return fallback !== undefined ? fallback : null;
  try {
    return JSON.parse(val);
  } catch {
    return fallback !== undefined ? fallback : val;
  }
}

function jsonStringify(val) {
  if (val === null || val === undefined) return null;
  return JSON.stringify(val);
}

// -------------------------------------------------------------------
// Institutions
// -------------------------------------------------------------------

const institutions = {
  getAll() {
    const rows = sqlite.prepare('SELECT * FROM institutions ORDER BY name').all();
    return rows.map(institutions._fromRow);
  },

  getByDomain(domain) {
    const row = sqlite.prepare('SELECT * FROM institutions WHERE domain = ?').get(domain);
    return row ? institutions._fromRow(row) : null;
  },

  upsert(inst) {
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO institutions
        (domain, name, membership_status, membership_start_date, membership_end_date,
         ai_coaching_enabled, ai_coaching_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      inst.domain,
      inst.name,
      inst.membershipStatus || 'pending',
      inst.membershipStartDate || null,
      inst.membershipEndDate || null,
      inst.aiCoachingEnabled ? 1 : 0,
      inst.aiCoachingUrl || '',
      inst.createdAt || new Date().toISOString(),
      inst.updatedAt || new Date().toISOString()
    );
  },

  delete(domain) {
    sqlite.prepare('DELETE FROM institutions WHERE domain = ?').run(domain);
  },

  _fromRow(row) {
    return {
      domain: row.domain,
      name: row.name,
      membershipStatus: row.membership_status,
      membershipStartDate: row.membership_start_date,
      membershipEndDate: row.membership_end_date,
      aiCoachingEnabled: !!row.ai_coaching_enabled,
      aiCoachingUrl: row.ai_coaching_url || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

// -------------------------------------------------------------------
// Blog Posts
// -------------------------------------------------------------------

const blogPosts = {
  getAll() {
    const rows = sqlite.prepare('SELECT * FROM blog_posts ORDER BY created_at DESC').all();
    return rows.map(blogPosts._fromRow);
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);
    return row ? blogPosts._fromRow(row) : null;
  },

  getBySlug(slug) {
    const row = sqlite.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(slug);
    return row ? blogPosts._fromRow(row) : null;
  },

  create(post) {
    const stmt = sqlite.prepare(`
      INSERT INTO blog_posts
        (id, title, slug, content, excerpt, category, tags, status,
         featured_image, author_id, author_name, created_at, updated_at,
         updated_by, published_at, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      post.id,
      post.title,
      post.slug,
      post.content || '',
      post.excerpt || '',
      post.category || 'News',
      jsonStringify(post.tags || []),
      post.status || 'draft',
      post.featuredImage || null,
      post.authorId || null,
      post.authorName || null,
      post.createdAt || new Date().toISOString(),
      post.updatedAt || new Date().toISOString(),
      post.updatedBy || null,
      post.publishedAt || null,
      post.viewCount || 0
    );
  },

  update(id, updates) {
    const existing = blogPosts.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const stmt = sqlite.prepare(`
      UPDATE blog_posts SET
        title = ?, slug = ?, content = ?, excerpt = ?, category = ?,
        tags = ?, status = ?, featured_image = ?, author_id = ?,
        author_name = ?, updated_at = ?, updated_by = ?,
        published_at = ?, view_count = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.title,
      merged.slug,
      merged.content || '',
      merged.excerpt || '',
      merged.category || 'News',
      jsonStringify(merged.tags || []),
      merged.status || 'draft',
      merged.featuredImage || null,
      merged.authorId || null,
      merged.authorName || null,
      merged.updatedAt || new Date().toISOString(),
      merged.updatedBy || null,
      merged.publishedAt || null,
      merged.viewCount || 0,
      id
    );
    return blogPosts.getById(id);
  },

  delete(id) {
    sqlite.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
  },

  incrementViewCount(id) {
    sqlite.prepare('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?').run(id);
  },

  _fromRow(row) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      category: row.category,
      tags: jsonParse(row.tags, []),
      status: row.status,
      featuredImage: row.featured_image,
      authorId: row.author_id,
      authorName: row.author_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      publishedAt: row.published_at,
      viewCount: row.view_count || 0,
    };
  },
};

// -------------------------------------------------------------------
// Blog Categories
// -------------------------------------------------------------------

const blogCategories = {
  getAll() {
    return sqlite.prepare('SELECT name FROM blog_categories ORDER BY name').all().map(r => r.name);
  },

  add(name) {
    sqlite.prepare('INSERT OR IGNORE INTO blog_categories (name) VALUES (?)').run(name);
  },

  delete(name) {
    sqlite.prepare('DELETE FROM blog_categories WHERE name = ?').run(name);
  },

  exists(name) {
    const row = sqlite.prepare('SELECT 1 FROM blog_categories WHERE name = ?').get(name);
    return !!row;
  },
};

// -------------------------------------------------------------------
// Blog Settings
// -------------------------------------------------------------------

const blogSettings = {
  getAll() {
    const rows = sqlite.prepare('SELECT key, value FROM blog_settings').all();
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = jsonParse(r.value, r.value);
    });
    return settings;
  },

  get(key) {
    const row = sqlite.prepare('SELECT value FROM blog_settings WHERE key = ?').get(key);
    return row ? jsonParse(row.value, row.value) : null;
  },

  set(key, value) {
    sqlite.prepare('INSERT OR REPLACE INTO blog_settings (key, value) VALUES (?, ?)').run(
      key,
      typeof value === 'object' ? jsonStringify(value) : String(value)
    );
  },

  setMany(obj) {
    const stmt = sqlite.prepare('INSERT OR REPLACE INTO blog_settings (key, value) VALUES (?, ?)');
    const tx = sqlite.transaction((entries) => {
      for (const [k, v] of entries) {
        stmt.run(k, typeof v === 'object' ? jsonStringify(v) : String(v));
      }
    });
    tx(Object.entries(obj));
  },
};

// -------------------------------------------------------------------
// Assessments
// -------------------------------------------------------------------

const assessments = {
  getAll() {
    const rows = sqlite.prepare('SELECT * FROM assessments ORDER BY created_at DESC').all();
    return rows.map(assessments._fromRow);
  },

  getByTransactionId(transactionId) {
    const row = sqlite.prepare('SELECT * FROM assessments WHERE transaction_id = ?').get(transactionId);
    return row ? assessments._fromRow(row) : null;
  },

  getByStudentId(studentId) {
    const rows = sqlite.prepare(
      'SELECT * FROM assessments WHERE student_id = ? AND sent_to_student = 1 ORDER BY created_at DESC'
    ).all(studentId);
    return rows.map(assessments._fromRow);
  },

  getAllTransactionIds() {
    return sqlite.prepare('SELECT transaction_id FROM assessments').all().map(r => r.transaction_id);
  },

  create(a) {
    const stmt = sqlite.prepare(`
      INSERT INTO assessments
        (assessment_id, transaction_id, student_id, student_name, assessor_id,
         assessor_name, company_name, project_title, ratings, comments,
         section_averages, overall_average, overall_comments, strengths,
         areas_for_improvement, recommend_for_future, sent_to_student, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      a.id,
      a.transactionId,
      a.studentId,
      a.studentName || '',
      a.assessorId,
      a.assessorName || '',
      a.companyName || '',
      a.projectTitle || '',
      jsonStringify(a.ratings),
      jsonStringify(a.comments || {}),
      jsonStringify(a.sectionAverages),
      a.overallAverage,
      a.overallComments || '',
      a.strengths || '',
      a.areasForImprovement || '',
      a.recommendForFuture ? 1 : 0,
      a.sentToStudent ? 1 : 0,
      a.createdAt || new Date().toISOString()
    );
  },

  updateSentToStudent(assessmentId, sent) {
    sqlite.prepare('UPDATE assessments SET sent_to_student = ? WHERE assessment_id = ?').run(sent ? 1 : 0, assessmentId);
  },

  _fromRow(row) {
    return {
      id: row.assessment_id,
      transactionId: row.transaction_id,
      studentId: row.student_id,
      studentName: row.student_name,
      assessorId: row.assessor_id,
      assessorName: row.assessor_name,
      companyName: row.company_name,
      projectTitle: row.project_title,
      ratings: jsonParse(row.ratings, {}),
      comments: jsonParse(row.comments, {}),
      sectionAverages: jsonParse(row.section_averages, {}),
      overallAverage: row.overall_average,
      overallComments: row.overall_comments,
      strengths: row.strengths,
      areasForImprovement: row.areas_for_improvement,
      recommendForFuture: !!row.recommend_for_future,
      sentToStudent: !!row.sent_to_student,
      createdAt: row.created_at,
    };
  },
};

// -------------------------------------------------------------------
// Blocked Coaching Students
// -------------------------------------------------------------------

const blockedStudents = {
  getAll() {
    return sqlite.prepare('SELECT * FROM blocked_coaching_students').all().map(blockedStudents._fromRow);
  },

  getByUserId(userId) {
    const row = sqlite.prepare('SELECT * FROM blocked_coaching_students WHERE user_id = ?').get(userId);
    return row ? blockedStudents._fromRow(row) : null;
  },

  isBlocked(userId) {
    const row = sqlite.prepare('SELECT 1 FROM blocked_coaching_students WHERE user_id = ?').get(userId);
    return !!row;
  },

  block(entry) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO blocked_coaching_students (user_id, reason, blocked_at, blocked_by)
      VALUES (?, ?, ?, ?)
    `).run(entry.userId, entry.reason || '', entry.blockedAt || new Date().toISOString(), entry.blockedBy || null);
  },

  unblock(userId) {
    sqlite.prepare('DELETE FROM blocked_coaching_students WHERE user_id = ?').run(userId);
  },

  _fromRow(row) {
    return {
      userId: row.user_id,
      reason: row.reason,
      blockedAt: row.blocked_at,
      blockedBy: row.blocked_by,
    };
  },
};

// -------------------------------------------------------------------
// Coaching Config
// -------------------------------------------------------------------

const coachingConfig = {
  getAll() {
    const rows = sqlite.prepare('SELECT key, value FROM coaching_config').all();
    const config = {};
    rows.forEach(r => {
      config[r.key] = jsonParse(r.value, r.value);
    });
    return config;
  },

  get(key) {
    const row = sqlite.prepare('SELECT value FROM coaching_config WHERE key = ?').get(key);
    return row ? jsonParse(row.value, row.value) : null;
  },

  set(key, value) {
    sqlite.prepare('INSERT OR REPLACE INTO coaching_config (key, value) VALUES (?, ?)').run(
      key,
      typeof value === 'object' ? jsonStringify(value) : String(value)
    );
  },

  setMany(obj) {
    const stmt = sqlite.prepare('INSERT OR REPLACE INTO coaching_config (key, value) VALUES (?, ?)');
    const tx = sqlite.transaction((entries) => {
      for (const [k, v] of entries) {
        stmt.run(k, typeof v === 'object' ? jsonStringify(v) : String(v));
      }
    });
    tx(Object.entries(obj));
  },
};

// -------------------------------------------------------------------
// Landing Content
// -------------------------------------------------------------------

const landingContent = {
  getAll() {
    const rows = sqlite.prepare('SELECT * FROM landing_content').all();
    const content = {};
    rows.forEach(r => {
      content[r.section] = jsonParse(r.content, {});
    });
    return content;
  },

  getSection(section) {
    const row = sqlite.prepare('SELECT * FROM landing_content WHERE section = ?').get(section);
    return row ? jsonParse(row.content, {}) : null;
  },

  setSection(section, content, updatedBy) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO landing_content (section, content, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
    `).run(section, jsonStringify(content), new Date().toISOString(), updatedBy || null);
  },

  setAll(contentObj, updatedBy) {
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO landing_content (section, content, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const tx = sqlite.transaction((entries) => {
      for (const [section, content] of entries) {
        stmt.run(section, jsonStringify(content), now, updatedBy || null);
      }
    });
    tx(Object.entries(contentObj));
  },

  deleteAll() {
    sqlite.prepare('DELETE FROM landing_content').run();
  },
};

// -------------------------------------------------------------------
// Tenant Content
// -------------------------------------------------------------------

const tenantContent = {
  getByDomain(domain) {
    const row = sqlite.prepare('SELECT * FROM tenant_content WHERE domain = ?').get(domain);
    return row ? jsonParse(row.content, null) : null;
  },

  set(domain, content, updatedBy) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO tenant_content (domain, content, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
    `).run(domain, jsonStringify(content), new Date().toISOString(), updatedBy || null);
  },

  delete(domain) {
    sqlite.prepare('DELETE FROM tenant_content WHERE domain = ?').run(domain);
  },
};

// -------------------------------------------------------------------
// Tenants
// -------------------------------------------------------------------

const tenants = {
  getAll() {
    return sqlite.prepare('SELECT * FROM tenants').all().map(tenants._fromRow);
  },

  getBySubdomain(subdomain) {
    const row = sqlite.prepare('SELECT * FROM tenants WHERE subdomain = ?').get(subdomain);
    return row ? tenants._fromRow(row) : null;
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    return row ? tenants._fromRow(row) : null;
  },

  upsert(t) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO tenants
        (id, subdomain, name, display_name, status, sharetribe_config,
         branding, institution_domain, corporate_partner_ids, features,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t.id,
      t.subdomain || null,
      t.name,
      t.displayName || null,
      t.status || 'active',
      jsonStringify(t.sharetribe || t.sharetribeConfig || null),
      jsonStringify(t.branding || null),
      t.institutionDomain || null,
      jsonStringify(t.corporatePartnerIds || []),
      jsonStringify(t.features || {}),
      t.createdAt || new Date().toISOString(),
      t.updatedAt || new Date().toISOString()
    );
  },

  delete(id) {
    sqlite.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  },

  _fromRow(row) {
    return {
      id: row.id,
      subdomain: row.subdomain,
      name: row.name,
      displayName: row.display_name,
      status: row.status,
      sharetribe: jsonParse(row.sharetribe_config, {}),
      branding: jsonParse(row.branding, {}),
      institutionDomain: row.institution_domain,
      corporatePartnerIds: jsonParse(row.corporate_partner_ids, []),
      features: jsonParse(row.features, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

// -------------------------------------------------------------------
// Student Waitlist
// -------------------------------------------------------------------

const waitlist = {
  getAll() {
    return sqlite.prepare('SELECT * FROM student_waitlist ORDER BY created_at DESC').all().map(waitlist._fromRow);
  },

  getByEmail(email) {
    const row = sqlite.prepare('SELECT * FROM student_waitlist WHERE email = ?').get(email?.toLowerCase());
    return row ? waitlist._fromRow(row) : null;
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM student_waitlist WHERE id = ?').get(id);
    return row ? waitlist._fromRow(row) : null;
  },

  create(entry) {
    sqlite.prepare(`
      INSERT INTO student_waitlist
        (id, email, first_name, last_name, domain, institution_name,
         created_at, last_attempt_at, attempts, contacted, notes, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.email?.toLowerCase(),
      entry.firstName || '',
      entry.lastName || '',
      entry.domain || '',
      entry.institutionName || '',
      entry.createdAt || new Date().toISOString(),
      entry.lastAttemptAt || new Date().toISOString(),
      entry.attempts || 1,
      entry.contacted ? 1 : 0,
      entry.notes || '',
      entry.updatedAt || null,
      entry.updatedBy || null
    );
  },

  update(id, updates) {
    const existing = waitlist.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    sqlite.prepare(`
      UPDATE student_waitlist SET
        first_name = ?, last_name = ?, institution_name = ?,
        last_attempt_at = ?, attempts = ?, contacted = ?, notes = ?,
        updated_at = ?, updated_by = ?
      WHERE id = ?
    `).run(
      merged.firstName || '',
      merged.lastName || '',
      merged.institutionName || '',
      merged.lastAttemptAt || null,
      merged.attempts || 1,
      merged.contacted ? 1 : 0,
      merged.notes || '',
      merged.updatedAt || new Date().toISOString(),
      merged.updatedBy || null,
      id
    );
    return waitlist.getById(id);
  },

  delete(id) {
    sqlite.prepare('DELETE FROM student_waitlist WHERE id = ?').run(id);
  },

  _fromRow(row) {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      domain: row.domain,
      institutionName: row.institution_name,
      createdAt: row.created_at,
      lastAttemptAt: row.last_attempt_at,
      attempts: row.attempts,
      contacted: !!row.contacted,
      notes: row.notes,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  },
};

// -------------------------------------------------------------------
// Educational Admin Applications
// -------------------------------------------------------------------

const eduAdminApplications = {
  getAll() {
    return sqlite.prepare('SELECT * FROM edu_admin_applications ORDER BY submitted_at DESC').all()
      .map(eduAdminApplications._fromRow);
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM edu_admin_applications WHERE id = ?').get(id);
    return row ? eduAdminApplications._fromRow(row) : null;
  },

  getByEmail(email) {
    const row = sqlite.prepare('SELECT * FROM edu_admin_applications WHERE email = ?').get(email?.toLowerCase());
    return row ? eduAdminApplications._fromRow(row) : null;
  },

  create(app) {
    sqlite.prepare(`
      INSERT INTO edu_admin_applications
        (id, first_name, last_name, email, email_domain, institution_name,
         institution_website, job_title, department, work_phone, reason,
         student_count, existing_user_id, status, submitted_at, reviewed_at,
         reviewed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.id,
      app.firstName,
      app.lastName,
      app.email?.toLowerCase(),
      app.emailDomain,
      app.institutionName,
      app.institutionWebsite || null,
      app.jobTitle,
      app.department,
      app.workPhone || null,
      app.reason,
      app.studentCount || null,
      app.existingUserId || null,
      app.status || 'pending',
      app.submittedAt || new Date().toISOString(),
      app.reviewedAt || null,
      app.reviewedBy || null,
      app.notes || null
    );
  },

  update(id, updates) {
    const existing = eduAdminApplications.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    sqlite.prepare(`
      UPDATE edu_admin_applications SET
        status = ?, reviewed_at = ?, reviewed_by = ?, notes = ?
      WHERE id = ?
    `).run(
      merged.status,
      merged.reviewedAt || null,
      merged.reviewedBy || null,
      merged.notes || null,
      id
    );
    return eduAdminApplications.getById(id);
  },

  _fromRow(row) {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      emailDomain: row.email_domain,
      institutionName: row.institution_name,
      institutionWebsite: row.institution_website,
      jobTitle: row.job_title,
      department: row.department,
      workPhone: row.work_phone,
      reason: row.reason,
      studentCount: row.student_count,
      existingUserId: row.existing_user_id,
      status: row.status,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      notes: row.notes,
    };
  },
};

// -------------------------------------------------------------------
// Education Messages
// -------------------------------------------------------------------

const educationMessages = {
  getAll() {
    return sqlite.prepare('SELECT * FROM education_messages ORDER BY sent_at DESC').all()
      .map(educationMessages._fromRow);
  },

  getBySenderId(senderId) {
    return sqlite.prepare(
      'SELECT * FROM education_messages WHERE sender_id = ? ORDER BY sent_at DESC'
    ).all(senderId).map(educationMessages._fromRow);
  },

  getByRecipientId(recipientId) {
    return sqlite.prepare(
      'SELECT * FROM education_messages WHERE recipient_id = ? ORDER BY sent_at DESC'
    ).all(recipientId).map(educationMessages._fromRow);
  },

  getReceivedByUser(userId) {
    return sqlite.prepare(
      `SELECT * FROM education_messages
       WHERE recipient_id = ? OR (recipient_type = 'educational-admin' AND sender_id != ?)
       ORDER BY sent_at DESC`
    ).all(userId, userId).map(educationMessages._fromRow);
  },

  create(msg) {
    sqlite.prepare(`
      INSERT INTO education_messages
        (id, sender_id, sender_name, sender_type, sender_institution,
         recipient_type, recipient_id, recipient_name, subject, content,
         sent_at, received_at, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.senderId,
      msg.senderName,
      msg.senderType,
      msg.senderInstitution || null,
      msg.recipientType,
      msg.recipientId || null,
      msg.recipientName || null,
      msg.subject,
      msg.content,
      msg.sentAt || new Date().toISOString(),
      msg.receivedAt || null,
      msg.read ? 1 : 0
    );
  },

  _fromRow(row) {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderType: row.sender_type,
      senderInstitution: row.sender_institution,
      recipientType: row.recipient_type,
      recipientId: row.recipient_id,
      recipientName: row.recipient_name,
      subject: row.subject,
      content: row.content,
      sentAt: row.sent_at,
      receivedAt: row.received_at,
      read: !!row.is_read,
    };
  },
};

// -------------------------------------------------------------------
// Attachments
// -------------------------------------------------------------------

const attachments = {
  getById(id) {
    const row = sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
    return row ? attachments._fromRow(row) : null;
  },

  getByContext(contextType, contextId) {
    return sqlite.prepare(
      'SELECT * FROM attachments WHERE context_type = ? AND context_id = ? ORDER BY uploaded_at DESC'
    ).all(contextType, contextId).map(attachments._fromRow);
  },

  create(a) {
    sqlite.prepare(`
      INSERT INTO attachments
        (id, original_name, stored_name, mime_type, size, size_formatted,
         file_type, extension, uploaded_by, uploaded_at, context_type,
         context_id, download_count, last_downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      a.id,
      a.originalName,
      a.storedName,
      a.mimeType,
      a.size,
      a.sizeFormatted || '',
      a.fileType || 'file',
      a.extension || '',
      a.uploadedBy,
      a.uploadedAt || new Date().toISOString(),
      a.contextType,
      a.contextId,
      a.downloadCount || 0,
      a.lastDownloadedAt || null
    );
  },

  incrementDownloadCount(id) {
    sqlite.prepare(
      'UPDATE attachments SET download_count = download_count + 1, last_downloaded_at = ? WHERE id = ?'
    ).run(new Date().toISOString(), id);
  },

  delete(id) {
    sqlite.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  },

  _fromRow(row) {
    return {
      id: row.id,
      originalName: row.original_name,
      storedName: row.stored_name,
      mimeType: row.mime_type,
      size: row.size,
      sizeFormatted: row.size_formatted,
      fileType: row.file_type,
      extension: row.extension,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      contextType: row.context_type,
      contextId: row.context_id,
      downloadCount: row.download_count,
      lastDownloadedAt: row.last_downloaded_at,
    };
  },
};

// -------------------------------------------------------------------
// Corporate Invites
// -------------------------------------------------------------------

const corporateInvites = {
  getByPartnerId(corporatePartnerId, { status, limit = 50 } = {}) {
    let sql = 'SELECT * FROM corporate_invites WHERE corporate_partner_id = ?';
    const params = [corporatePartnerId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY sent_at DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return sqlite.prepare(sql).all(...params).map(corporateInvites._fromRow);
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM corporate_invites WHERE id = ?').get(id);
    return row ? corporateInvites._fromRow(row) : null;
  },

  getByStudentId(studentId, { status, limit = 50 } = {}) {
    let sql = 'SELECT * FROM corporate_invites WHERE student_id = ?';
    const params = [studentId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY sent_at DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return sqlite.prepare(sql).all(...params).map(corporateInvites._fromRow);
  },

  updateStatusById(inviteId, status) {
    const now = new Date().toISOString();
    sqlite.prepare(
      'UPDATE corporate_invites SET status = ?, responded_at = ? WHERE id = ?'
    ).run(status, now, inviteId);
    const row = sqlite.prepare('SELECT * FROM corporate_invites WHERE id = ?').get(inviteId);
    return row ? corporateInvites._fromRow(row) : null;
  },

  create(invite) {
    sqlite.prepare(`
      INSERT INTO corporate_invites
        (id, corporate_partner_id, student_id, student_name, student_email,
         student_university, listing_id, project_title, message,
         transaction_id, status, sent_at, responded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invite.id,
      invite.corporatePartnerId,
      invite.studentId,
      invite.studentName || '',
      invite.studentEmail || '',
      invite.studentUniversity || '',
      invite.listingId,
      invite.projectTitle || '',
      invite.message || '',
      invite.transactionId || null,
      invite.status || 'pending',
      invite.sentAt || new Date().toISOString(),
      invite.respondedAt || null
    );
  },

  updateStatus(corporatePartnerId, transactionId, status) {
    const now = new Date().toISOString();
    sqlite.prepare(
      'UPDATE corporate_invites SET status = ?, responded_at = ? WHERE corporate_partner_id = ? AND transaction_id = ?'
    ).run(status, now, corporatePartnerId, transactionId);
    // Return the updated invite
    const row = sqlite.prepare(
      'SELECT * FROM corporate_invites WHERE corporate_partner_id = ? AND transaction_id = ?'
    ).get(corporatePartnerId, transactionId);
    return row ? corporateInvites._fromRow(row) : null;
  },

  _fromRow(row) {
    return {
      id: row.id,
      corporatePartnerId: row.corporate_partner_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentUniversity: row.student_university,
      listingId: row.listing_id,
      projectTitle: row.project_title,
      message: row.message,
      transactionId: row.transaction_id,
      status: row.status,
      sentAt: row.sent_at,
      respondedAt: row.responded_at,
    };
  },
};

// -------------------------------------------------------------------
// NDA Documents
// -------------------------------------------------------------------

const ndaDocuments = {
  getByListingId(listingId) {
    const row = sqlite.prepare('SELECT * FROM nda_documents WHERE listing_id = ?').get(listingId);
    return row ? ndaDocuments._fromRow(row) : null;
  },

  upsert(doc) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO nda_documents
        (listing_id, document_id, uploaded_by, uploaded_at, document_url,
         document_name, nda_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.listingId,
      doc.id || doc.documentId || null,
      doc.uploadedBy,
      doc.uploadedAt || new Date().toISOString(),
      doc.documentUrl || null,
      doc.documentName || 'NDA Agreement',
      doc.ndaText || null,
      doc.status || 'active'
    );
  },

  _fromRow(row) {
    return {
      id: row.document_id,
      listingId: row.listing_id,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      documentUrl: row.document_url,
      documentName: row.document_name,
      ndaText: row.nda_text,
      status: row.status,
    };
  },
};

// -------------------------------------------------------------------
// NDA Signature Requests
// -------------------------------------------------------------------

const ndaSignatures = {
  getByTransactionId(transactionId) {
    const row = sqlite.prepare('SELECT * FROM nda_signature_requests WHERE transaction_id = ?').get(transactionId);
    return row ? ndaSignatures._fromRow(row) : null;
  },

  upsert(req) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO nda_signature_requests
        (transaction_id, signature_id, listing_id, title, status, created_at,
         completed_at, signers, document_url, nda_text, signed_document_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.transactionId,
      req.id || req.signatureId || null,
      req.listingId || null,
      req.title || '',
      req.status || 'pending',
      req.createdAt || new Date().toISOString(),
      req.completedAt || null,
      jsonStringify(req.signers || []),
      req.documentUrl || null,
      req.ndaText || null,
      req.signedDocumentUrl || null
    );
  },

  _fromRow(row) {
    return {
      id: row.signature_id,
      transactionId: row.transaction_id,
      listingId: row.listing_id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      signers: jsonParse(row.signers, []),
      documentUrl: row.document_url,
      ndaText: row.nda_text,
      signedDocumentUrl: row.signed_document_url,
    };
  },
};

// -------------------------------------------------------------------
// Notifications
// -------------------------------------------------------------------

const notifications = {
  getByUserId(userId, { limit = 20, unreadOnly = false } = {}) {
    let sql = 'SELECT * FROM notifications WHERE recipient_id = ?';
    const params = [userId];
    if (unreadOnly) {
      sql += ' AND is_read = 0';
    }
    sql += ' ORDER BY created_at DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return sqlite.prepare(sql).all(...params).map(notifications._fromRow);
  },

  getUnreadCount(userId) {
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0'
    ).get(userId);
    return row ? row.count : 0;
  },

  create(n) {
    sqlite.prepare(`
      INSERT INTO notifications
        (id, recipient_id, type, subject, content, data, is_read, read_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      n.id,
      n.recipientId,
      n.type,
      n.subject || '',
      n.content || '',
      jsonStringify(n.data || null),
      n.read ? 1 : 0,
      n.readAt || null,
      n.createdAt || new Date().toISOString()
    );
  },

  markRead(userId, notificationId) {
    const now = new Date().toISOString();
    sqlite.prepare(
      'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND recipient_id = ?'
    ).run(now, notificationId, userId);
    return notifications.getById(notificationId);
  },

  markAllRead(userId) {
    const now = new Date().toISOString();
    const info = sqlite.prepare(
      'UPDATE notifications SET is_read = 1, read_at = ? WHERE recipient_id = ? AND is_read = 0'
    ).run(now, userId);
    return info.changes;
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? notifications._fromRow(row) : null;
  },

  _fromRow(row) {
    return {
      id: row.id,
      recipientId: row.recipient_id,
      type: row.type,
      subject: row.subject,
      content: row.content,
      data: jsonParse(row.data, null),
      read: !!row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  },
};

// -------------------------------------------------------------------
// Admin Messages
// -------------------------------------------------------------------

const adminMessages = {
  getAll() {
    return sqlite.prepare('SELECT * FROM admin_messages ORDER BY created_at DESC').all()
      .map(adminMessages._fromRow);
  },

  getBySenderId(senderId) {
    return sqlite.prepare(
      'SELECT * FROM admin_messages WHERE sender_id = ? ORDER BY created_at DESC'
    ).all(senderId).map(adminMessages._fromRow);
  },

  getByRecipientId(recipientId) {
    return sqlite.prepare(
      'SELECT * FROM admin_messages WHERE recipient_id = ? ORDER BY created_at DESC'
    ).all(recipientId).map(adminMessages._fromRow);
  },

  getById(id) {
    const row = sqlite.prepare('SELECT * FROM admin_messages WHERE id = ?').get(id);
    return row ? adminMessages._fromRow(row) : null;
  },

  getUnreadCountByRecipient(recipientId) {
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM admin_messages WHERE recipient_id = ? AND is_read = 0'
    ).get(recipientId);
    return row ? row.count : 0;
  },

  create(msg) {
    sqlite.prepare(`
      INSERT INTO admin_messages
        (id, sender_id, sender_name, recipient_id, recipient_type, recipient_name,
         recipient_institution, recipient_university, subject, content, student,
         severity, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.senderId,
      msg.senderName,
      msg.recipientId,
      msg.recipientType,
      msg.recipientName || null,
      msg.recipientInstitution || null,
      msg.recipientUniversity || null,
      msg.subject,
      msg.content,
      jsonStringify(msg.student || null),
      msg.severity || 'info',
      msg.read ? 1 : 0,
      msg.createdAt || new Date().toISOString()
    );
  },

  markRead(messageId) {
    sqlite.prepare('UPDATE admin_messages SET is_read = 1 WHERE id = ?').run(messageId);
  },

  _fromRow(row) {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      recipientId: row.recipient_id,
      recipientType: row.recipient_type,
      recipientName: row.recipient_name,
      recipientInstitution: row.recipient_institution,
      recipientUniversity: row.recipient_university,
      subject: row.subject,
      content: row.content,
      student: jsonParse(row.student, null),
      severity: row.severity,
      read: !!row.is_read,
      createdAt: row.created_at,
    };
  },
};

// -------------------------------------------------------------------
// Transaction helper (expose sqlite.transaction for multi-step ops)
// -------------------------------------------------------------------

function transaction(fn) {
  return sqlite.transaction(fn);
}

// -------------------------------------------------------------------
// Export
// -------------------------------------------------------------------

module.exports = {
  // Raw database handle (for advanced use, e.g. custom queries)
  _sqlite: sqlite,
  transaction,

  // Domain-organized helpers
  institutions,
  blogPosts,
  blogCategories,
  blogSettings,
  assessments,
  blockedStudents,
  coachingConfig,
  landingContent,
  tenantContent,
  tenants,
  waitlist,
  eduAdminApplications,
  educationMessages,
  attachments,
  corporateInvites,
  ndaDocuments,
  ndaSignatures,
  notifications,
  adminMessages,
};
