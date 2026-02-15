-- ============================================================================
-- Street2Ivy Platform — Core Database Schema
-- PostgreSQL 16+
--
-- Run this FIRST, before street2ivy_multi_tenant.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE membership_status AS ENUM ('pending', 'active', 'inactive');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_role AS ENUM ('admin', 'student', 'corporate_partner', 'educational_admin');
CREATE TYPE application_status AS ENUM (
  'pending', 'accepted', 'rejected', 'declined', 'withdrawn', 'cancelled', 'completed'
);
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE message_type AS ENUM ('user', 'system');
CREATE TYPE message_severity AS ENUM ('info', 'warning', 'urgent');
CREATE TYPE nda_status AS ENUM ('pending', 'completed');
CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE initiated_by_type AS ENUM ('student', 'corporate');
CREATE TYPE sender_role_type AS ENUM ('student', 'corporate', 'system', 'educational-admin', 'system-admin');
CREATE TYPE edu_admin_app_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE attachment_file_type AS ENUM ('file', 'image', 'document');

-- ============================================================================
-- 1. INSTITUTIONS — Educational organizations
-- ============================================================================

CREATE TABLE institutions (
  domain              TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  membership_status   membership_status NOT NULL DEFAULT 'pending',
  membership_start_date TIMESTAMPTZ,
  membership_end_date   TIMESTAMPTZ,
  ai_coaching_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_coaching_url     TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. TENANTS — Multi-tenant instances
-- ============================================================================

CREATE TABLE tenants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subdomain             TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  display_name          TEXT,
  status                tenant_status NOT NULL DEFAULT 'active',
  sharetribe_config     JSONB DEFAULT '{}'::jsonb,
  branding              JSONB DEFAULT '{}'::jsonb,
  institution_domain    TEXT REFERENCES institutions(domain) ON DELETE SET NULL,
  corporate_partner_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  features              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_institution ON tenants(institution_domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================================
-- 3. USERS — Platform users (replaces Sharetribe user management)
-- ============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  display_name    TEXT GENERATED ALWAYS AS (
    CASE WHEN first_name = '' AND last_name = '' THEN email
         WHEN last_name = '' THEN first_name
         ELSE first_name || ' ' || last_name
    END
  ) STORED,
  role            user_role NOT NULL DEFAULT 'student',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url      TEXT,
  phone           TEXT,
  bio             TEXT DEFAULT '',
  university      TEXT,
  major           TEXT,
  graduation_year INTEGER,
  gpa             TEXT,
  company_name    TEXT,
  job_title       TEXT,
  department      TEXT,
  institution_domain TEXT REFERENCES institutions(domain) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  public_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  private_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_institution ON users(institution_domain);

-- ============================================================================
-- 4. SKILLS — Skill catalog for matching students to projects
-- ============================================================================

CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_category ON skills(category);

-- ============================================================================
-- 5. USER_SKILLS — Many-to-many: users ↔ skills
-- ============================================================================

CREATE TABLE user_skills (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id  UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

-- ============================================================================
-- 6. LISTINGS — Project/opportunity listings (replaces Sharetribe listings)
-- ============================================================================

CREATE TABLE listings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT,
  skills_required   JSONB NOT NULL DEFAULT '[]'::jsonb,
  location          TEXT,
  remote_allowed    BOOLEAN NOT NULL DEFAULT FALSE,
  compensation      TEXT,
  hours_per_week    INTEGER,
  duration          TEXT,
  start_date        TIMESTAMPTZ,
  end_date          TIMESTAMPTZ,
  max_applicants    INTEGER,
  requires_nda      BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'draft',
  public_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at      TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_author ON listings(author_id);
CREATE INDEX idx_listings_tenant ON listings(tenant_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category);

-- ============================================================================
-- 7. STUDENT_WAITLIST — Students pending approval/enrollment
-- ============================================================================

CREATE TABLE student_waitlist (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT NOT NULL,
  first_name        TEXT,
  last_name         TEXT,
  domain            TEXT,
  institution_name  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at   TIMESTAMPTZ,
  attempts          INTEGER NOT NULL DEFAULT 1,
  contacted         BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ,
  updated_by        UUID
);

CREATE UNIQUE INDEX idx_student_waitlist_email ON student_waitlist(email);

-- ============================================================================
-- 8. EDU_ADMIN_APPLICATIONS — Institution admin applications
-- ============================================================================

CREATE TABLE edu_admin_applications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name            TEXT,
  last_name             TEXT,
  email                 TEXT NOT NULL,
  email_domain          TEXT,
  institution_name      TEXT,
  institution_website   TEXT,
  job_title             TEXT,
  department            TEXT,
  work_phone            TEXT,
  reason                TEXT,
  student_count         TEXT,
  existing_user_id      UUID,
  status                edu_admin_app_status NOT NULL DEFAULT 'pending',
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID,
  notes                 TEXT
);

CREATE UNIQUE INDEX idx_edu_admin_applications_email ON edu_admin_applications(email);

-- ============================================================================
-- 9. PROJECT_APPLICATIONS — Students applying to projects
-- ============================================================================

CREATE TABLE project_applications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id            UUID NOT NULL,
  listing_id            UUID NOT NULL,
  transaction_id        TEXT,
  invite_id             UUID,
  corporate_id          UUID,
  corporate_name        TEXT,
  corporate_email       TEXT,
  student_name          TEXT,
  student_email         TEXT,
  listing_title         TEXT,
  cover_letter          TEXT,
  resume_attachment_id  UUID,
  availability_date     TEXT,
  interest_reason       TEXT,
  skills                JSONB NOT NULL DEFAULT '[]'::jsonb,
  relevant_coursework   TEXT,
  gpa                   TEXT,
  hours_per_week        INTEGER,
  references_text       TEXT,
  initiated_by          initiated_by_type NOT NULL DEFAULT 'student',
  invitation_message    TEXT,
  rejection_reason      TEXT,
  status                application_status NOT NULL DEFAULT 'pending',
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at          TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  reviewer_notes        TEXT,
  completed_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_applications_student ON project_applications(student_id);
CREATE INDEX idx_project_applications_listing ON project_applications(listing_id);
CREATE INDEX idx_project_applications_status ON project_applications(status);
CREATE INDEX idx_project_applications_transaction ON project_applications(transaction_id);
CREATE INDEX idx_project_applications_corporate ON project_applications(corporate_id);
CREATE INDEX idx_project_applications_initiated_by ON project_applications(initiated_by);

-- ============================================================================
-- 10. APPLICATION_MESSAGES — Messages within application context
-- ============================================================================

CREATE TABLE application_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES project_applications(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL,
  sender_name     TEXT,
  sender_role     TEXT,
  content         TEXT NOT NULL,
  message_type    message_type NOT NULL DEFAULT 'user',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_messages_application ON application_messages(application_id, created_at);
CREATE INDEX idx_app_messages_sender ON application_messages(sender_id);
CREATE INDEX idx_app_messages_unread ON application_messages(application_id, read_at)
  WHERE read_at IS NULL;

-- ============================================================================
-- 11. CORPORATE_INVITES — Corporate partners inviting students
-- ============================================================================

CREATE TABLE corporate_invites (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_partner_id  UUID NOT NULL,
  student_id            UUID NOT NULL,
  student_name          TEXT,
  student_email         TEXT,
  student_university    TEXT,
  listing_id            UUID,
  project_title         TEXT,
  message               TEXT NOT NULL DEFAULT '',
  transaction_id        TEXT,
  status                invite_status NOT NULL DEFAULT 'pending',
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at          TIMESTAMPTZ
);

CREATE INDEX idx_corporate_invites_partner ON corporate_invites(corporate_partner_id);
CREATE INDEX idx_corporate_invites_student ON corporate_invites(student_id);

-- ============================================================================
-- 12. NDA_DOCUMENTS — NDA document storage
-- ============================================================================

CREATE TABLE nda_documents (
  listing_id      UUID PRIMARY KEY,
  document_id     TEXT,
  uploaded_by     UUID,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  document_url    TEXT,
  document_name   TEXT,
  nda_text        TEXT,
  status          nda_status NOT NULL DEFAULT 'active'::text::nda_status
);

-- ============================================================================
-- 13. NDA_SIGNATURE_REQUESTS — Signature tracking
-- ============================================================================

CREATE TABLE nda_signature_requests (
  transaction_id        TEXT PRIMARY KEY,
  signature_id          TEXT,
  listing_id            UUID,
  title                 TEXT,
  status                nda_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  signers               JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_url          TEXT,
  nda_text              TEXT,
  signed_document_url   TEXT
);

-- ============================================================================
-- 14. ASSESSMENTS — Performance evaluations
-- ============================================================================

CREATE TABLE assessments (
  id                      SERIAL PRIMARY KEY,
  assessment_id           UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  transaction_id          TEXT,
  student_id              UUID NOT NULL,
  student_name            TEXT,
  assessor_id             UUID NOT NULL,
  assessor_name           TEXT,
  company_name            TEXT,
  project_title           TEXT,
  ratings                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments                JSONB NOT NULL DEFAULT '{}'::jsonb,
  section_averages        JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_average         REAL,
  overall_comments        TEXT NOT NULL DEFAULT '',
  strengths               TEXT NOT NULL DEFAULT '',
  areas_for_improvement   TEXT NOT NULL DEFAULT '',
  recommend_for_future    BOOLEAN NOT NULL DEFAULT FALSE,
  sent_to_student         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_student ON assessments(student_id);
CREATE INDEX idx_assessments_transaction ON assessments(transaction_id);

-- ============================================================================
-- 14b. CORPORATE_RATINGS — Public ratings students give to corporate partners
-- ============================================================================

CREATE TABLE corporate_ratings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    UUID NOT NULL REFERENCES project_applications(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corporate_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id        UUID REFERENCES listings(id) ON DELETE SET NULL,
  project_title     TEXT,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, student_id)
);

CREATE INDEX idx_corporate_ratings_corporate ON corporate_ratings(corporate_id);
CREATE INDEX idx_corporate_ratings_student ON corporate_ratings(student_id);
CREATE INDEX idx_corporate_ratings_application ON corporate_ratings(application_id);

-- ============================================================================
-- 14c. STUDENT_RATINGS — Private ratings corporate partners give to students
-- ============================================================================

CREATE TABLE student_ratings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id        UUID NOT NULL REFERENCES project_applications(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corporate_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id            UUID REFERENCES listings(id) ON DELETE SET NULL,
  project_title         TEXT,
  rating                INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text           TEXT,
  strengths             TEXT,
  areas_for_improvement TEXT,
  recommend_for_future  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, corporate_id)
);

CREATE INDEX idx_student_ratings_student ON student_ratings(student_id);
CREATE INDEX idx_student_ratings_corporate ON student_ratings(corporate_id);
CREATE INDEX idx_student_ratings_application ON student_ratings(application_id);

-- ============================================================================
-- 15. BLOCKED_COACHING_STUDENTS — AI coaching blocklist
-- ============================================================================

CREATE TABLE blocked_coaching_students (
  user_id     UUID PRIMARY KEY,
  reason      TEXT NOT NULL DEFAULT '',
  blocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by  UUID
);

-- ============================================================================
-- 16. COACHING_CONFIG — Key-value configuration store
-- ============================================================================

CREATE TABLE coaching_config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 17. EDUCATION_MESSAGES — Student ↔ Educational admin messaging
-- ============================================================================

CREATE TABLE education_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id           UUID NOT NULL,
  sender_name         TEXT,
  sender_type         TEXT,
  sender_institution  TEXT,
  recipient_type      TEXT,
  recipient_id        UUID NOT NULL,
  recipient_name      TEXT,
  subject             TEXT,
  content             TEXT NOT NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at         TIMESTAMPTZ,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_education_messages_sender ON education_messages(sender_id);
CREATE INDEX idx_education_messages_recipient ON education_messages(recipient_id);

-- ============================================================================
-- 18. ADMIN_MESSAGES — System admin → user messages
-- ============================================================================

CREATE TABLE admin_messages (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id               UUID NOT NULL,
  sender_name             TEXT,
  recipient_id            UUID NOT NULL,
  recipient_type          TEXT,
  recipient_name          TEXT,
  recipient_institution   TEXT,
  recipient_university    TEXT,
  subject                 TEXT,
  content                 TEXT NOT NULL,
  student                 JSONB DEFAULT '{}'::jsonb,
  severity                message_severity NOT NULL DEFAULT 'info',
  is_read                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_messages_sender ON admin_messages(sender_id);
CREATE INDEX idx_admin_messages_recipient ON admin_messages(recipient_id);

-- ============================================================================
-- 19. DIRECT_MESSAGES — Threaded 1:1 conversations
-- ============================================================================

CREATE TABLE direct_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id       TEXT NOT NULL,
  sender_id       UUID NOT NULL,
  sender_name     TEXT,
  sender_type     TEXT,
  recipient_id    UUID NOT NULL,
  recipient_name  TEXT,
  recipient_type  TEXT,
  subject         TEXT,
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_direct_messages_thread ON direct_messages(thread_id, created_at);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id);

-- ============================================================================
-- 20. NOTIFICATIONS — System notifications
-- ============================================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL,
  type          TEXT NOT NULL,
  subject       TEXT,
  content       TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read)
  WHERE is_read = FALSE;

-- ============================================================================
-- 21. ATTACHMENTS — File uploads
-- ============================================================================

CREATE TABLE attachments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name       TEXT,
  stored_name         TEXT,
  mime_type           TEXT,
  size                INTEGER,
  size_formatted      TEXT,
  file_type           attachment_file_type NOT NULL DEFAULT 'file',
  extension           TEXT,
  uploaded_by         UUID,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_type        TEXT,
  context_id          TEXT,
  download_count      INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at  TIMESTAMPTZ
);

CREATE INDEX idx_attachments_context ON attachments(context_type, context_id);

-- ============================================================================
-- 22. BLOG_POSTS — Blog content management
-- ============================================================================

CREATE TABLE blog_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  excerpt         TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'News',
  tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
  status          blog_status NOT NULL DEFAULT 'draft',
  featured_image  TEXT,
  author_id       UUID,
  author_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID,
  published_at    TIMESTAMPTZ,
  view_count      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);

-- ============================================================================
-- 23. BLOG_CATEGORIES
-- ============================================================================

CREATE TABLE blog_categories (
  name TEXT PRIMARY KEY
);

-- ============================================================================
-- 24. BLOG_SETTINGS — Key-value blog configuration
-- ============================================================================

CREATE TABLE blog_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================================================
-- 25. LANDING_CONTENT — Landing page section content
-- ============================================================================

CREATE TABLE landing_content (
  section     TEXT PRIMARY KEY,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);

-- ============================================================================
-- 26. TENANT_CONTENT — Tenant-specific landing page content
-- ============================================================================

CREATE TABLE tenant_content (
  domain      TEXT PRIMARY KEY REFERENCES institutions(domain) ON DELETE CASCADE,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);

-- ============================================================================
-- 27. SESSIONS — Server-side session store (for auth)
-- ============================================================================

CREATE TABLE sessions (
  sid         TEXT PRIMARY KEY,
  sess        JSONB NOT NULL,
  expire      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions(expire);

-- ============================================================================
-- 28. AUDIT_LOG — Security audit trail
-- ============================================================================

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================================================
-- SEED DATA — Skills catalog
-- ============================================================================

INSERT INTO skills (name, category) VALUES
  -- Programming Languages
  ('Python', 'Programming Languages'),
  ('JavaScript', 'Programming Languages'),
  ('TypeScript', 'Programming Languages'),
  ('Java', 'Programming Languages'),
  ('C++', 'Programming Languages'),
  ('C#', 'Programming Languages'),
  ('Go', 'Programming Languages'),
  ('Rust', 'Programming Languages'),
  ('Ruby', 'Programming Languages'),
  ('PHP', 'Programming Languages'),
  ('Swift', 'Programming Languages'),
  ('Kotlin', 'Programming Languages'),
  ('R', 'Programming Languages'),
  ('Scala', 'Programming Languages'),
  ('SQL', 'Programming Languages'),
  -- Web Development
  ('React', 'Web Development'),
  ('Angular', 'Web Development'),
  ('Vue.js', 'Web Development'),
  ('Next.js', 'Web Development'),
  ('Node.js', 'Web Development'),
  ('Express.js', 'Web Development'),
  ('Django', 'Web Development'),
  ('Flask', 'Web Development'),
  ('Spring Boot', 'Web Development'),
  ('Ruby on Rails', 'Web Development'),
  ('HTML/CSS', 'Web Development'),
  ('Tailwind CSS', 'Web Development'),
  ('GraphQL', 'Web Development'),
  ('REST APIs', 'Web Development'),
  -- Data & AI
  ('Machine Learning', 'Data & AI'),
  ('Deep Learning', 'Data & AI'),
  ('Natural Language Processing', 'Data & AI'),
  ('Computer Vision', 'Data & AI'),
  ('Data Analysis', 'Data & AI'),
  ('Data Visualization', 'Data & AI'),
  ('TensorFlow', 'Data & AI'),
  ('PyTorch', 'Data & AI'),
  ('Pandas', 'Data & AI'),
  ('NumPy', 'Data & AI'),
  ('Scikit-learn', 'Data & AI'),
  ('Tableau', 'Data & AI'),
  ('Power BI', 'Data & AI'),
  ('Apache Spark', 'Data & AI'),
  -- Cloud & DevOps
  ('AWS', 'Cloud & DevOps'),
  ('Azure', 'Cloud & DevOps'),
  ('Google Cloud', 'Cloud & DevOps'),
  ('Docker', 'Cloud & DevOps'),
  ('Kubernetes', 'Cloud & DevOps'),
  ('CI/CD', 'Cloud & DevOps'),
  ('Terraform', 'Cloud & DevOps'),
  ('Linux', 'Cloud & DevOps'),
  ('Git', 'Cloud & DevOps'),
  ('Jenkins', 'Cloud & DevOps'),
  ('GitHub Actions', 'Cloud & DevOps'),
  -- Databases
  ('PostgreSQL', 'Databases'),
  ('MySQL', 'Databases'),
  ('MongoDB', 'Databases'),
  ('Redis', 'Databases'),
  ('Elasticsearch', 'Databases'),
  ('DynamoDB', 'Databases'),
  ('Firebase', 'Databases'),
  -- Mobile Development
  ('React Native', 'Mobile Development'),
  ('Flutter', 'Mobile Development'),
  ('iOS Development', 'Mobile Development'),
  ('Android Development', 'Mobile Development'),
  -- Design & Product
  ('UI/UX Design', 'Design & Product'),
  ('Figma', 'Design & Product'),
  ('Adobe Creative Suite', 'Design & Product'),
  ('Product Management', 'Design & Product'),
  ('User Research', 'Design & Product'),
  ('Wireframing', 'Design & Product'),
  -- Business & Finance
  ('Financial Modeling', 'Business & Finance'),
  ('Financial Analysis', 'Business & Finance'),
  ('Accounting', 'Business & Finance'),
  ('Business Strategy', 'Business & Finance'),
  ('Market Research', 'Business & Finance'),
  ('Project Management', 'Business & Finance'),
  ('Agile/Scrum', 'Business & Finance'),
  ('Excel/Google Sheets', 'Business & Finance'),
  ('Consulting', 'Business & Finance'),
  -- Marketing & Communications
  ('Digital Marketing', 'Marketing & Communications'),
  ('Content Writing', 'Marketing & Communications'),
  ('SEO/SEM', 'Marketing & Communications'),
  ('Social Media Marketing', 'Marketing & Communications'),
  ('Email Marketing', 'Marketing & Communications'),
  ('Public Relations', 'Marketing & Communications'),
  ('Copywriting', 'Marketing & Communications'),
  ('Google Analytics', 'Marketing & Communications'),
  -- Engineering & Science
  ('Mechanical Engineering', 'Engineering & Science'),
  ('Electrical Engineering', 'Engineering & Science'),
  ('Chemical Engineering', 'Engineering & Science'),
  ('Biomedical Engineering', 'Engineering & Science'),
  ('Civil Engineering', 'Engineering & Science'),
  ('Environmental Science', 'Engineering & Science'),
  ('Statistics', 'Engineering & Science'),
  ('Mathematics', 'Engineering & Science'),
  ('Physics', 'Engineering & Science'),
  ('Biology', 'Engineering & Science'),
  ('Chemistry', 'Engineering & Science'),
  -- Soft Skills
  ('Leadership', 'Soft Skills'),
  ('Communication', 'Soft Skills'),
  ('Teamwork', 'Soft Skills'),
  ('Problem Solving', 'Soft Skills'),
  ('Critical Thinking', 'Soft Skills'),
  ('Time Management', 'Soft Skills'),
  ('Presentation Skills', 'Soft Skills'),
  ('Negotiation', 'Soft Skills'),
  ('Adaptability', 'Soft Skills')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA — Blog categories
-- ============================================================================

INSERT INTO blog_categories (name) VALUES
  ('News'),
  ('Career Advice'),
  ('Student Spotlight'),
  ('Corporate Partners'),
  ('Platform Updates'),
  ('Industry Insights'),
  ('Tips & Tricks'),
  ('Events')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA — Default coaching configuration
-- ============================================================================

INSERT INTO coaching_config (key, value) VALUES
  ('platformUrl', 'https://demo.app.amikoxr.com/login'),
  ('platformName', 'AI Career Coach'),
  ('platformStatus', 'true'),
  ('welcomeMessage', 'Welcome to your AI Career Coach! Get personalized career guidance, resume tips, and interview preparation.'),
  ('termsOfUseUrl', ''),
  ('confidentialityWarning', 'Do not share proprietary or confidential information from your projects in coaching conversations.'),
  ('updatedAt', NOW()::text),
  ('updatedBy', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED DATA — Default landing content sections
-- ============================================================================

INSERT INTO landing_content (section, content) VALUES
  ('branding', '{"siteName": "Street2Ivy", "tagline": "Connecting Students with Real-World Experience", "logoUrl": "", "faviconUrl": ""}'::jsonb),
  ('hero', '{"title": "Launch Your Career", "subtitle": "Connect with top companies and gain real-world experience while still in school.", "ctaText": "Get Started", "ctaLink": "/signup", "backgroundImage": ""}'::jsonb),
  ('features', '{"items": []}'::jsonb),
  ('testimonials', '{"items": []}'::jsonb),
  ('cta', '{"title": "Ready to Get Started?", "subtitle": "Join thousands of students already building their careers.", "buttonText": "Sign Up Now", "buttonLink": "/signup"}'::jsonb)
ON CONFLICT (section) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER tr_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_project_applications_updated_at
  BEFORE UPDATE ON project_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_landing_content_updated_at
  BEFORE UPDATE ON landing_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tenant_content_updated_at
  BEFORE UPDATE ON tenant_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE — Core schema created successfully
-- ============================================================================
