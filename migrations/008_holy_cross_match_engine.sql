-- ============================================================================
-- Migration 008: Holy Cross — Full Match Engine™ Demo Setup
--
-- Upgrades the Holy Cross Crusaders Football tenant to Enterprise plan
-- with all Match Engine™ features enabled, seeds demo match engine config,
-- sample student schedules, match scores, and corporate attractiveness data.
-- ============================================================================

-- ============================================================================
-- 1. Upgrade Holy Cross tenant to Enterprise with all features
-- ============================================================================
UPDATE tenants SET
  features = jsonb_build_object(
    'plan', 'enterprise',
    'aiCoaching', true,
    'customBranding', true,
    'analytics', true,
    'apiAccess', true,
    'advancedReporting', true,
    'studentRatings', true,
    'corporateRatings', true,
    'matchingAlgorithm', true,
    'issueReporting', true,
    'inviteManagement', true,
    'aiMatchInsights', true,
    'aiDiffView', true,
    'aiProjectScoping', true,
    'aiPortfolioIntelligence', true,
    'aiTalentInsights', true,
    'matchEngine', true,
    'matchEngineSchedule', true,
    'matchEngineAttractive', true,
    'matchEngineAdmin', true,
    'maxStudents', -1,
    'maxListings', -1
  )
WHERE subdomain = 'holy-cross-football';

-- ============================================================================
-- 2. Update create_athletic_tenant to include Match Engine™ features
-- ============================================================================
CREATE OR REPLACE FUNCTION create_athletic_tenant(
    p_institution TEXT,
    p_sport TEXT,
    p_team_name TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_plan TEXT DEFAULT 'starter',
    p_conference TEXT DEFAULT NULL,
    p_custom_domain TEXT DEFAULT NULL,
    p_hero_headline TEXT DEFAULT NULL,
    p_hero_subheadline TEXT DEFAULT NULL,
    p_hero_video_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_tenant_id UUID;
    new_admin_id UUID;
BEGIN
    INSERT INTO tenants (
        name, display_name, subdomain, status,
        marketplace_type, sport, team_name, conference,
        hero_headline, hero_subheadline, hero_video_url,
        shared_network_enabled, network_tier,
        features
    )
    VALUES (
        p_institution || ' ' || p_sport,
        p_team_name,
        p_slug,
        'active',
        'athletic',
        p_sport,
        p_team_name,
        p_conference,
        p_hero_headline,
        p_hero_subheadline,
        p_hero_video_url,
        true,
        'full',
        jsonb_build_object(
            'plan', p_plan,
            'aiCoaching', true,
            'inviteManagement', true,
            'customBranding', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'analytics', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'advancedReporting', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'studentRatings', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'corporateRatings', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'matchingAlgorithm', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'issueReporting', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiMatchInsights', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiDiffView', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiProjectScoping', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'apiAccess', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            'aiPortfolioIntelligence', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            'aiTalentInsights', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            -- Match Engine™ features
            'matchEngine', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'matchEngineSchedule', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'matchEngineAttractive', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            'matchEngineAdmin', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END
        )
    )
    RETURNING id INTO new_tenant_id;

    INSERT INTO users (
        email, first_name, last_name,
        role, tenant_id, is_active,
        password_hash
    )
    VALUES (
        p_admin_email,
        p_admin_first_name,
        p_admin_last_name,
        'educational_admin',
        new_tenant_id,
        true,
        'pending_setup'
    )
    RETURNING id INTO new_admin_id;

    RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. Match Engine Config for Holy Cross
-- ============================================================================
INSERT INTO match_engine_config (
  tenant_id,
  signal_weights,
  min_score_threshold,
  max_results_per_query,
  enable_athletic_transfer,
  enable_schedule_matching,
  config
)
SELECT
  id,
  '{"temporal": 0.25, "skills": 0.30, "sustainability": 0.15, "growth": 0.10, "trust": 0.10, "network": 0.10}'::jsonb,
  15.00,
  100,
  true,
  true,
  '{"description": "Holy Cross Crusaders Football — Enterprise Match Engine config"}'::jsonb
FROM tenants
WHERE subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. Demo Student Accounts for Holy Cross
-- ============================================================================
-- Create 6 demo student-athletes linked to the Holy Cross tenant
INSERT INTO users (email, first_name, last_name, role, tenant_id, is_active, password_hash, university, major, gpa, graduation_year, metadata)
SELECT
  v.email, v.first_name, v.last_name, 'student', t.id, true, 'demo_password_hash',
  'College of the Holy Cross', v.major, v.gpa, v.grad_year,
  jsonb_build_object('sportsPlayed', 'Football', 'position', v.position)
FROM tenants t
CROSS JOIN (VALUES
  ('marcus.williams@holycross.edu', 'Marcus', 'Williams', 'Finance', '3.6', 2026, 'Quarterback'),
  ('james.chen@holycross.edu', 'James', 'Chen', 'Computer Science', '3.8', 2025, 'Wide Receiver'),
  ('david.okafor@holycross.edu', 'David', 'Okafor', 'Economics', '3.4', 2026, 'Linebacker'),
  ('ryan.murphy@holycross.edu', 'Ryan', 'Murphy', 'Marketing', '3.5', 2027, 'Offensive Line'),
  ('tyler.jackson@holycross.edu', 'Tyler', 'Jackson', 'Data Science', '3.7', 2025, 'Safety'),
  ('alex.rodriguez@holycross.edu', 'Alex', 'Rodriguez', 'Management', '3.3', 2026, 'Running Back')
) AS v(email, first_name, last_name, major, gpa, grad_year, position)
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 5. Demo Skills for Students
-- ============================================================================
-- First ensure demo skills exist
INSERT INTO skills (name, category) VALUES
  ('Leadership', 'Soft Skills'),
  ('Communication', 'Soft Skills'),
  ('Strategic Thinking', 'Soft Skills'),
  ('Data Analysis', 'Technical'),
  ('Financial Modeling', 'Technical'),
  ('Project Management', 'Soft Skills'),
  ('Python', 'Technical'),
  ('Excel', 'Technical'),
  ('Public Speaking', 'Soft Skills'),
  ('Team Management', 'Soft Skills'),
  ('Market Research', 'Technical'),
  ('SQL', 'Technical'),
  ('Problem Solving', 'Soft Skills'),
  ('Decision Making', 'Soft Skills'),
  ('Adaptability', 'Soft Skills'),
  ('Time Management', 'Soft Skills'),
  ('Resilience', 'Soft Skills'),
  ('JavaScript', 'Technical'),
  ('React', 'Technical'),
  ('Machine Learning', 'Technical')
ON CONFLICT DO NOTHING;

-- Assign skills to each student
-- Marcus Williams (QB / Finance) — Leadership, Strategic Thinking, Financial Modeling, Communication, Decision Making
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('Leadership', 5), ('Strategic Thinking', 4), ('Financial Modeling', 4), ('Communication', 5), ('Decision Making', 5), ('Excel', 3), ('Public Speaking', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'marcus.williams@holycross.edu'
ON CONFLICT DO NOTHING;

-- James Chen (WR / CS) — JavaScript, React, Python, Data Analysis, Adaptability
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('JavaScript', 5), ('React', 4), ('Python', 4), ('Data Analysis', 4), ('Adaptability', 4), ('SQL', 3), ('Machine Learning', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'james.chen@holycross.edu'
ON CONFLICT DO NOTHING;

-- David Okafor (LB / Economics) — Data Analysis, Market Research, Excel, Problem Solving, Team Management
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('Data Analysis', 4), ('Market Research', 4), ('Excel', 5), ('Problem Solving', 5), ('Team Management', 4), ('Communication', 3), ('Strategic Thinking', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'david.okafor@holycross.edu'
ON CONFLICT DO NOTHING;

-- Ryan Murphy (OL / Marketing) — Project Management, Communication, Market Research, Team Management, Resilience
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('Project Management', 4), ('Communication', 4), ('Market Research', 4), ('Team Management', 4), ('Resilience', 5), ('Public Speaking', 3), ('Time Management', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'ryan.murphy@holycross.edu'
ON CONFLICT DO NOTHING;

-- Tyler Jackson (Safety / Data Science) — Python, SQL, Data Analysis, Machine Learning, Problem Solving
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('Python', 5), ('SQL', 5), ('Data Analysis', 5), ('Machine Learning', 4), ('Problem Solving', 4), ('Strategic Thinking', 3), ('Excel', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'tyler.jackson@holycross.edu'
ON CONFLICT DO NOTHING;

-- Alex Rodriguez (RB / Management) — Leadership, Time Management, Project Management, Communication, Adaptability
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u
CROSS JOIN (VALUES
  ('Leadership', 4), ('Time Management', 5), ('Project Management', 4), ('Communication', 4), ('Adaptability', 5), ('Decision Making', 4), ('Resilience', 5)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'alex.rodriguez@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. Demo Student Schedules (Football seasons for Holy Cross students)
-- ============================================================================
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'regular' THEN 12
    WHEN 'preseason' THEN 6
    WHEN 'postseason' THEN 10
    WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Football ' || ss.season_type || ' season'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email IN (
  'marcus.williams@holycross.edu',
  'james.chen@holycross.edu',
  'david.okafor@holycross.edu',
  'ryan.murphy@holycross.edu',
  'tyler.jackson@holycross.edu',
  'alex.rodriguez@holycross.edu'
)
AND ss.sport_name = 'Football'
AND u.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'holy-cross-football')
ON CONFLICT DO NOTHING;

-- Add academic calendar schedules for all students
INSERT INTO student_schedules (user_id, academic_calendar_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ac.id, 'academic',
  CASE
    WHEN ac.is_break = true THEN 30
    ELSE 15
  END,
  true,
  ac.term_name
FROM users u
CROSS JOIN academic_calendars ac
WHERE u.email IN (
  'marcus.williams@holycross.edu',
  'james.chen@holycross.edu',
  'david.okafor@holycross.edu',
  'ryan.murphy@holycross.edu',
  'tyler.jackson@holycross.edu',
  'alex.rodriguez@holycross.edu'
)
AND ac.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'holy-cross-football')
AND u.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'holy-cross-football')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. Demo Corporate Partner User + Listings for Holy Cross
-- ============================================================================
-- Create a corporate partner user linked to the Holy Cross tenant
INSERT INTO users (email, first_name, last_name, role, tenant_id, is_active, password_hash, company_name, job_title)
SELECT
  'mark@johnsonconsulting.example.com', 'Mark', 'Johnson', 'corporate_partner', t.id, true, 'demo_password_hash',
  'Johnson Consulting Group', 'Managing Director'
FROM tenants t
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT (email) DO NOTHING;

-- Create demo listings
INSERT INTO listings (title, description, category, skills_required, hours_per_week, compensation, remote_allowed, status, author_id, tenant_id, listing_type, published_at)
SELECT
  v.title, v.description, v.category, to_jsonb(v.skills), v.hours, v.comp, v.remote, 'published',
  u.id, t.id, 'project', NOW() - (v.days_ago || ' days')::interval
FROM users u
CROSS JOIN tenants t
CROSS JOIN (VALUES
  ('Market Analysis: Patriot League NIL Landscape',
   'Analyze the NIL (Name, Image, Likeness) landscape across Patriot League schools. Research current NIL deals, compile a competitive analysis, and deliver a strategic report with recommendations for our clients.',
   'Business Strategy', ARRAY['Market Research', 'Data Analysis', 'Excel', 'Communication'], 10, 'Paid - $20/hr', true, 7),
  ('Financial Model for Alumni Venture Fund',
   'Build a financial projection model for a new alumni-backed venture fund. Create cash flow projections, IRR analysis, and investor presentation materials.',
   'Finance', ARRAY['Financial Modeling', 'Excel', 'Strategic Thinking', 'Communication'], 12, 'Paid - $25/hr', false, 14),
  ('Social Media Analytics Dashboard',
   'Design and build a dashboard to track social media engagement metrics for our client portfolio. Use Python, SQL, and a visualization library to create interactive reports.',
   'Technology', ARRAY['Python', 'SQL', 'Data Analysis', 'JavaScript'], 15, 'Paid - $22/hr', true, 3),
  ('Leadership Workshop Curriculum Development',
   'Develop a 6-session leadership workshop curriculum tailored for student-athletes transitioning to the professional world. Include case studies, exercises, and assessment rubrics.',
   'Education', ARRAY['Leadership', 'Communication', 'Project Management', 'Public Speaking'], 8, 'Stipend - $500', true, 21),
  ('Operations Process Improvement Study',
   'Conduct a process improvement study for a mid-market manufacturing client. Map current workflows, identify bottlenecks, and propose lean solutions.',
   'Operations', ARRAY['Problem Solving', 'Data Analysis', 'Project Management', 'Excel'], 12, 'Paid - $20/hr', false, 10),
  ('Machine Learning Sports Performance Predictor',
   'Build a machine learning model to predict player performance metrics using historical data. Deliver a trained model with documentation and a simple API endpoint.',
   'Technology', ARRAY['Python', 'Machine Learning', 'Data Analysis', 'SQL'], 15, 'Paid - $28/hr', true, 5)
) AS v(title, description, category, skills, hours, comp, remote, days_ago)
WHERE u.email = 'mark@johnsonconsulting.example.com'
  AND t.subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 8. Demo Match Scores (pre-computed for demo)
-- ============================================================================
-- Generate match scores between students and listings
INSERT INTO match_scores (student_id, listing_id, tenant_id, composite_score, signal_breakdown, computation_time_ms, version)
SELECT
  u.id,
  l.id,
  t.id,
  v.score,
  jsonb_build_object(
    'temporal', jsonb_build_object('score', v.temporal, 'weight', 0.25),
    'skills', jsonb_build_object('score', v.skills, 'weight', 0.30),
    'sustainability', jsonb_build_object('score', v.sustain, 'weight', 0.15),
    'growth', jsonb_build_object('score', v.growth, 'weight', 0.10),
    'trust', jsonb_build_object('score', v.trust, 'weight', 0.10),
    'network', jsonb_build_object('score', v.network, 'weight', 0.10)
  ),
  FLOOR(RANDOM() * 50 + 20)::int,
  1
FROM tenants t
-- Marcus Williams × Market Analysis (strong match — leadership, communication, market research)
CROSS JOIN (VALUES
  ('marcus.williams@holycross.edu', 'Market Analysis: Patriot League NIL Landscape', 82.5, 0.75, 0.88, 0.80, 0.85, 0.78, 0.90)
) AS v(student_email, listing_title, score, temporal, skills, sustain, growth, trust, network)
JOIN users u ON u.email = v.student_email
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;

INSERT INTO match_scores (student_id, listing_id, tenant_id, composite_score, signal_breakdown, computation_time_ms, version)
SELECT u.id, l.id, t.id, v.score,
  jsonb_build_object(
    'temporal', jsonb_build_object('score', v.temporal, 'weight', 0.25),
    'skills', jsonb_build_object('score', v.skills, 'weight', 0.30),
    'sustainability', jsonb_build_object('score', v.sustain, 'weight', 0.15),
    'growth', jsonb_build_object('score', v.growth, 'weight', 0.10),
    'trust', jsonb_build_object('score', v.trust, 'weight', 0.10),
    'network', jsonb_build_object('score', v.network, 'weight', 0.10)
  ),
  FLOOR(RANDOM() * 50 + 20)::int, 1
FROM tenants t
CROSS JOIN (VALUES
  -- Marcus Williams × Financial Model (excellent match — finance major, strategic thinking)
  ('marcus.williams@holycross.edu', 'Financial Model for Alumni Venture Fund', 91.0, 0.70, 0.95, 0.85, 0.92, 0.88, 0.95),
  -- James Chen × Social Media Dashboard (excellent match — CS, Python, JS)
  ('james.chen@holycross.edu', 'Social Media Analytics Dashboard', 88.5, 0.72, 0.92, 0.82, 0.90, 0.85, 0.88),
  -- James Chen × ML Sports Predictor (top match — CS, ML, Python)
  ('james.chen@holycross.edu', 'Machine Learning Sports Performance Predictor', 94.0, 0.68, 0.98, 0.78, 0.95, 0.85, 0.92),
  -- David Okafor × Market Analysis (good match — econ, data analysis)
  ('david.okafor@holycross.edu', 'Market Analysis: Patriot League NIL Landscape', 76.5, 0.78, 0.82, 0.75, 0.70, 0.72, 0.80),
  -- David Okafor × Operations Study (strong match — problem solving, data)
  ('david.okafor@holycross.edu', 'Operations Process Improvement Study', 84.0, 0.80, 0.88, 0.82, 0.78, 0.80, 0.82),
  -- Ryan Murphy × Leadership Workshop (excellent match — leadership, communication)
  ('ryan.murphy@holycross.edu', 'Leadership Workshop Curriculum Development', 87.0, 0.82, 0.90, 0.88, 0.82, 0.85, 0.90),
  -- Ryan Murphy × Operations Study (good match — project mgmt)
  ('ryan.murphy@holycross.edu', 'Operations Process Improvement Study', 72.0, 0.75, 0.75, 0.72, 0.68, 0.70, 0.78),
  -- Tyler Jackson × ML Sports Predictor (top match — data science, ML)
  ('tyler.jackson@holycross.edu', 'Machine Learning Sports Performance Predictor', 96.5, 0.65, 0.99, 0.80, 0.95, 0.90, 0.88),
  -- Tyler Jackson × Social Media Dashboard (strong match — Python, SQL, data)
  ('tyler.jackson@holycross.edu', 'Social Media Analytics Dashboard', 85.0, 0.70, 0.90, 0.80, 0.85, 0.82, 0.85),
  -- Alex Rodriguez × Leadership Workshop (good match — leadership, time mgmt)
  ('alex.rodriguez@holycross.edu', 'Leadership Workshop Curriculum Development', 79.0, 0.80, 0.82, 0.78, 0.75, 0.78, 0.85),
  -- Alex Rodriguez × Market Analysis (fair match — adaptability, communication)
  ('alex.rodriguez@holycross.edu', 'Market Analysis: Patriot League NIL Landscape', 65.0, 0.72, 0.65, 0.70, 0.62, 0.60, 0.75)
) AS v(student_email, listing_title, score, temporal, skills, sustain, growth, trust, network)
JOIN users u ON u.email = v.student_email
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. Demo Corporate Attractiveness Scores
-- ============================================================================
INSERT INTO corporate_attractiveness_scores (listing_id, author_id, tenant_id, attractiveness_score, signal_breakdown, sample_size)
SELECT l.id, u.id, t.id, v.score,
  jsonb_build_object(
    'compensation', v.comp_score,
    'flexibility', v.flex_score,
    'growth_opportunity', v.growth_score,
    'alumni_connection', v.alumni_score
  ),
  v.samples
FROM tenants t
JOIN users u ON u.email = 'mark@johnsonconsulting.example.com' AND u.tenant_id = t.id
CROSS JOIN (VALUES
  ('Market Analysis: Patriot League NIL Landscape', 78.5, 0.72, 0.85, 0.78, 0.95, 4),
  ('Financial Model for Alumni Venture Fund', 85.0, 0.88, 0.60, 0.90, 0.95, 3),
  ('Social Media Analytics Dashboard', 82.0, 0.78, 0.90, 0.85, 0.80, 5),
  ('Leadership Workshop Curriculum Development', 71.0, 0.55, 0.88, 0.72, 0.92, 3),
  ('Operations Process Improvement Study', 74.5, 0.72, 0.55, 0.78, 0.88, 2),
  ('Machine Learning Sports Performance Predictor', 90.0, 0.92, 0.90, 0.92, 0.82, 6)
) AS v(listing_title, score, comp_score, flex_score, growth_score, alumni_score, samples)
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 10. Demo Match Feedback
-- ============================================================================
INSERT INTO match_feedback (student_id, listing_id, user_id, feedback_type, rating, comment)
SELECT u.id, l.id, u.id, 'relevance', v.rating, v.comment
FROM tenants t
CROSS JOIN (VALUES
  ('james.chen@holycross.edu', 'Machine Learning Sports Performance Predictor', 5, 'Perfect fit for my data science skills and football background!'),
  ('marcus.williams@holycross.edu', 'Financial Model for Alumni Venture Fund', 5, 'Great match — combines my finance coursework with real alumni network'),
  ('tyler.jackson@holycross.edu', 'Social Media Analytics Dashboard', 4, 'Good match, would prefer more ML-focused work'),
  ('ryan.murphy@holycross.edu', 'Leadership Workshop Curriculum Development', 5, 'Exactly what I want to do — teaching leadership to athletes'),
  ('david.okafor@holycross.edu', 'Operations Process Improvement Study', 4, 'Solid project, good use of my analytical skills')
) AS v(student_email, listing_title, rating, comment)
JOIN users u ON u.email = v.student_email
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done — Holy Cross is now a fully-loaded Match Engine™ demo tenant
-- ============================================================================
