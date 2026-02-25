-- ============================================================================
-- Migration 016: Holy Cross Pilot Tenant — Career Services Demo
--
-- Provisions a full institutional pilot tenant for the College of the Holy
-- Cross (Worcester, MA) so the Director of Career Services can evaluate
-- ProveGround. Includes 15 students, 10 employers, 15 projects, full
-- lifecycle data (applications, ratings, portfolios, match scores).
--
-- This is SEPARATE from the existing 'holy-cross-football' athletic tenant.
-- Marketplace type is 'institution' (not 'athletic').
--
-- All student names are FICTIONAL. Employer names are real companies but
-- project descriptions are fictional.
--
-- All inserts use ON CONFLICT DO NOTHING for idempotency.
-- ============================================================================


-- ============================================================================
-- 1. INSTITUTION
-- ============================================================================
INSERT INTO institutions (domain, name, membership_status, membership_start_date, ai_coaching_enabled)
VALUES (
  'holycross.edu',
  'College of the Holy Cross',
  'active',
  NOW(),
  true
)
ON CONFLICT (domain) DO UPDATE SET
  membership_status = 'active',
  ai_coaching_enabled = true;


-- ============================================================================
-- 2. TENANT — holy-cross-pilot (Enterprise, institution marketplace)
-- ============================================================================
INSERT INTO tenants (
  subdomain, name, display_name, status,
  institution_domain, marketplace_type,
  conference,
  branding,
  hero_headline,
  hero_subheadline,
  about_content,
  contact_info,
  social_links,
  features
)
VALUES (
  'holy-cross-pilot',
  'College of the Holy Cross',
  'Holy Cross',
  'active',
  'holycross.edu',
  'institution',
  'Patriot League',
  '{
    "primaryColor": "#582C83",
    "secondaryColor": "#FFFFFF",
    "accentColor": "#A77BCA",
    "logoUrl": null,
    "faviconUrl": null,
    "welcomeMessage": "Welcome to the College of the Holy Cross talent marketplace",
    "tagline": "Men and Women for Others"
  }'::jsonb,
  'Where Holy Cross Talent Meets Real-World Opportunity',
  'Project-based experiences connecting Crusader students with employers across the Worcester-Boston corridor.',
  'Founded in 1843, the College of the Holy Cross is a highly selective Jesuit liberal arts college in Worcester, Massachusetts. With approximately 3,100 undergraduates, Holy Cross is consistently ranked among the top liberal arts colleges in the nation. Our Career Services office partners with ProveGround to connect students with meaningful project-based experiences that complement their rigorous liberal arts education.',
  '{"email": "careers@holycross.edu", "phone": "(508) 793-3880", "address": "1 College Street, Worcester, MA 01610"}'::jsonb,
  '{"website": "https://holycross.edu", "linkedin": "https://linkedin.com/school/college-of-the-holy-cross"}'::jsonb,
  jsonb_build_object(
    'plan', 'enterprise',
    'maxStudents', -1,
    'maxListings', -1,
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
    'skillsGapAnalyzer', true,
    'portfolioBuilder', true,
    'outcomesDashboard', true,
    'handshakeIntegration', true,
    'teamHuddle', true
  )
)
ON CONFLICT (subdomain) DO NOTHING;


-- ============================================================================
-- 3. ADMIN USER — Career Services Director (placeholder)
-- ============================================================================
INSERT INTO users (
  email, first_name, last_name, role, tenant_id, is_active,
  password_hash, job_title, bio, email_verified
)
SELECT
  'admin@holycross-pilot.proveground.com',
  'HC Career Services',
  'Admin',
  'educational_admin',
  t.id,
  true,
  crypt('HolyCrossPilot2026!', gen_salt('bf', 10)),
  'Director of Career Services',
  'Institutional administrator for the College of the Holy Cross ProveGround pilot. This account manages student access, employer partnerships, project oversight, and analytics.',
  true
FROM tenants t
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 4. STUDENT PROFILES (15 students)
-- ============================================================================
INSERT INTO users (
  email, first_name, last_name, role, tenant_id, is_active,
  password_hash, university, major, gpa, graduation_year, bio, email_verified, metadata
)
SELECT
  v.email, v.first_name, v.last_name, 'student', t.id, true,
  crypt('HCPilot2026!', gen_salt('bf', 10)),
  'College of the Holy Cross', v.major, v.gpa, v.grad_year, v.bio, true, v.meta::jsonb
FROM tenants t
CROSS JOIN (VALUES
  -- 1. Marcus Williams — Economics, Senior, Men's Basketball, 3.5
  ('marcus.williams.hcp@holycross.edu', 'Marcus', 'Williams', 'Economics', '3.5', 2026,
   'Senior Economics major and starting guard on the Holy Cross men''s basketball team. I bring analytical rigor from the classroom and competitive discipline from the court to every project. Interested in financial services, consulting, and sports management.',
   '{"sport": "Basketball (M)", "position": "Guard", "activities": "Economics Club, Student-Athlete Advisory Committee"}'),

  -- 2. Sofia Reyes — Political Science, Junior, Women's Soccer, 3.7
  ('sofia.reyes@holycross.edu', 'Sofia', 'Reyes', 'Political Science', '3.7', 2027,
   'Junior Political Science major and midfielder on the women''s soccer team. Passionate about public policy, civic engagement, and community organizing. Bilingual in English and Spanish with strong research and communication skills.',
   '{"sport": "Soccer (W)", "position": "Midfielder", "activities": "Model UN, Latinx Student Alliance, Community Service"}'),

  -- 3. James O''Brien — Biology, Senior, Football (LB), 3.3
  ('james.obrien@holycross.edu', 'James', 'O''Brien', 'Biology', '3.3', 2026,
   'Senior Biology major and linebacker on the football team. My science background and athletic discipline make me a strong fit for healthcare, research, and biotech roles. Balancing 20+ hours of football with a demanding pre-med curriculum has taught me exceptional time management.',
   '{"sport": "Football", "position": "Linebacker", "activities": "Pre-Med Society, Biology Research Lab"}'),

  -- 4. Aisha Patel — Psychology, Junior, 3.8
  ('aisha.patel@holycross.edu', 'Aisha', 'Patel', 'Psychology', '3.8', 2027,
   'Junior Psychology major with a concentration in organizational behavior. Research assistant in the Cognitive Science Lab studying decision-making under uncertainty. Interested in UX research, human factors, and organizational consulting.',
   '{"activities": "Psychology Research Lab, Peer Counseling, South Asian Student Association"}'),

  -- 5. David Chen — Computer Science, Sophomore, 3.6
  ('david.chen.hcp@holycross.edu', 'David', 'Chen', 'Computer Science', '3.6', 2028,
   'Sophomore Computer Science major with a minor in Mathematics. Building a portfolio of full-stack projects and contributing to open-source. Strong in Python, JavaScript, and SQL with growing interest in machine learning and data engineering.',
   '{"activities": "CS Club President, Hackathon Team, Math Tutor"}'),

  -- 6. Gabriela Santos — Economics, Senior, Women's Rowing, 3.4
  ('gabriela.santos@holycross.edu', 'Gabriela', 'Santos', 'Economics', '3.4', 2026,
   'Senior Economics major and varsity rower on Lake Quinsigamond. The discipline of 5 AM practices and structured training translates directly to my work ethic in consulting and finance projects. Interested in economic development and sustainability.',
   '{"sport": "Rowing", "position": "Varsity 8", "activities": "Economics Honor Society, Sustainability Club, Portuguese Cultural Club"}'),

  -- 7. Ryan McCarthy — History, Junior, 3.5
  ('ryan.mccarthy@holycross.edu', 'Ryan', 'McCarthy', 'History', '3.5', 2027,
   'Junior History major with a minor in Political Science. Strong writer and researcher with experience in archival research and policy analysis. Interested in government, nonprofit work, and education. Published in the college history journal.',
   '{"activities": "History Journal Editor, Student Government, College Democrats"}'),

  -- 8. Zoe Washington — English, Senior, Track & Field, 3.7
  ('zoe.washington@holycross.edu', 'Zoe', 'Washington', 'English', '3.7', 2026,
   'Senior English major and sprinter on the track and field team. Exceptional writer and communicator — I''ve written for the college newspaper, managed social media campaigns, and tutored writing for three years. Looking for opportunities in media, marketing, and publishing.',
   '{"sport": "Track & Field", "position": "Sprints", "activities": "College Newspaper Editor, Writing Center Tutor, Black Student Union"}'),

  -- 9. Liam Fitzpatrick — Political Science, Senior, 3.6
  ('liam.fitzpatrick@holycross.edu', 'Liam', 'Fitzpatrick', 'Political Science', '3.6', 2026,
   'Senior Political Science major with a concentration in American Politics. Completed an internship at the Massachusetts State House and conducted thesis research on municipal governance. Interested in public policy, government relations, and political consulting.',
   '{"activities": "Student Government President, Pre-Law Society, Debate Team"}'),

  -- 10. Priya Sharma — Mathematics, Junior, 3.9
  ('priya.sharma@holycross.edu', 'Priya', 'Sharma', 'Mathematics', '3.9', 2027,
   'Junior Mathematics major with a minor in Computer Science. Top of my class with a passion for statistical modeling and quantitative analysis. Research assistant working on applied statistics problems. Interested in data science, actuarial science, and quantitative finance.',
   '{"activities": "Math Honor Society, Data Science Research, Tutoring Center"}'),

  -- 11. Tyler Jackson — Sociology, Sophomore, Football (WR), 3.2
  ('tyler.jackson.hcp@holycross.edu', 'Tyler', 'Jackson', 'Sociology', '3.2', 2028,
   'Sophomore Sociology major and wide receiver on the football team. Interested in understanding how social structures shape communities and opportunities. Balancing athletics and academics has given me strong time management and teamwork skills.',
   '{"sport": "Football", "position": "Wide Receiver", "activities": "Sociology Club, Community Outreach, Fellowship of Athletes"}'),

  -- 12. Megan Sullivan — Psychology, Senior, 3.5
  ('megan.sullivan@holycross.edu', 'Megan', 'Sullivan', 'Psychology', '3.5', 2026,
   'Senior Psychology major with research experience in developmental psychology and program evaluation. Skilled in SPSS, survey design, and qualitative analysis. Passionate about youth development, education, and social services.',
   '{"activities": "Peer Health Education, Volunteer Tutor, Psychology Honor Society"}'),

  -- 13. Andre Thompson — Philosophy, Junior, Men's Rowing, 3.4
  ('andre.thompson@holycross.edu', 'Andre', 'Thompson', 'Philosophy', '3.4', 2027,
   'Junior Philosophy major and member of the men''s rowing team. I bring the same discipline from 5 AM rows on Lake Quinsigamond to my academic work in ethics and critical reasoning. Interested in law, consulting, and nonprofit leadership.',
   '{"sport": "Rowing", "position": "Varsity 4", "activities": "Ethics Bowl Team, Rowing Team Captain, Jesuit Service Corps"}'),

  -- 14. Chloe Nguyen — Biology, Sophomore, 3.8
  ('chloe.nguyen@holycross.edu', 'Chloe', 'Nguyen', 'Biology', '3.8', 2028,
   'Sophomore Biology major on the pre-med track with strong research skills in molecular biology. Lab assistant in the Biochemistry department. Interested in healthcare, public health, and life sciences. Detail-oriented and skilled in scientific writing.',
   '{"activities": "Biology Research Lab, Pre-Med Club, Asian Student Association, Volunteer EMT"}'),

  -- 15. Daniel Morales — Economics, Junior, 3.6
  ('daniel.morales@holycross.edu', 'Daniel', 'Morales', 'Economics', '3.6', 2027,
   'Junior Economics major with a minor in Data Analytics. Skilled in R, Stata, and Excel with experience in econometric modeling. Interested in economic consulting, public policy research, and urban economics. First-generation college student.',
   '{"activities": "First-Gen Student Network, Economics Research Assistant, Intramural Basketball"}')

) AS v(email, first_name, last_name, major, gpa, grad_year, bio, meta)
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 5. ADDITIONAL SKILLS (beyond what's in street2ivy_schema.sql seed)
-- ============================================================================
INSERT INTO skills (name, category) VALUES
  ('Strategic Thinking', 'Soft Skills'),
  ('Decision Making', 'Soft Skills'),
  ('Resilience', 'Soft Skills'),
  ('Team Management', 'Soft Skills'),
  ('Survey Design', 'Business & Finance'),
  ('Program Evaluation', 'Business & Finance'),
  ('Policy Research', 'Business & Finance'),
  ('SPSS', 'Data & AI'),
  ('Stata', 'Data & AI'),
  ('Journalism', 'Marketing & Communications'),
  ('Graphic Design', 'Design & Product'),
  ('Adobe InDesign', 'Design & Product'),
  ('Canva', 'Design & Product'),
  ('Health Communication', 'Marketing & Communications'),
  ('Cybersecurity', 'Cloud & DevOps'),
  ('Instructional Design', 'Business & Finance'),
  ('Process Mapping', 'Business & Finance'),
  ('UX Research', 'Design & Product'),
  ('Interviewing', 'Soft Skills'),
  ('Photography', 'Design & Product'),
  ('Spanish', 'Soft Skills'),
  ('Scientific Writing', 'Marketing & Communications'),
  ('Qualitative Analysis', 'Data & AI'),
  ('Econometrics', 'Data & AI')
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- 6. STUDENT SKILLS
-- ============================================================================

-- Marcus Williams (Economics, Basketball) — Finance + Leadership
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Financial Modeling', 4), ('Data Analysis', 4), ('Excel/Google Sheets', 5),
  ('Market Research', 4), ('Leadership', 5), ('Communication', 4),
  ('Strategic Thinking', 4), ('Presentation Skills', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'marcus.williams.hcp@holycross.edu'
ON CONFLICT DO NOTHING;

-- Sofia Reyes (Political Science, Soccer) — Policy + Communication
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Policy Research', 4), ('Communication', 5), ('Data Analysis', 3),
  ('Content Writing', 4), ('Spanish', 5), ('Leadership', 4),
  ('Teamwork', 5), ('Public Relations', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'sofia.reyes@holycross.edu'
ON CONFLICT DO NOTHING;

-- James O'Brien (Biology, Football LB) — Science + Healthcare
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Biology', 4), ('Data Analysis', 3), ('Scientific Writing', 4),
  ('Statistics', 3), ('Teamwork', 5), ('Problem Solving', 4),
  ('Time Management', 5), ('Leadership', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'james.obrien@holycross.edu'
ON CONFLICT DO NOTHING;

-- Aisha Patel (Psychology) — Research + UX
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('SPSS', 4), ('Survey Design', 4), ('Data Analysis', 4),
  ('UX Research', 3), ('Qualitative Analysis', 4), ('Communication', 4),
  ('Critical Thinking', 5), ('Content Writing', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'aisha.patel@holycross.edu'
ON CONFLICT DO NOTHING;

-- David Chen (Computer Science) — Full-Stack Dev
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Python', 4), ('JavaScript', 4), ('SQL', 4),
  ('React', 3), ('Machine Learning', 3), ('Data Analysis', 4),
  ('Git', 4), ('HTML/CSS', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'david.chen.hcp@holycross.edu'
ON CONFLICT DO NOTHING;

-- Gabriela Santos (Economics, Rowing) — Economics + Sustainability
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Financial Analysis', 4), ('Excel/Google Sheets', 4), ('Data Analysis', 4),
  ('Market Research', 3), ('Teamwork', 5), ('Communication', 4),
  ('Statistics', 3), ('Consulting', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'gabriela.santos@holycross.edu'
ON CONFLICT DO NOTHING;

-- Ryan McCarthy (History) — Research + Writing
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Content Writing', 5), ('Policy Research', 4), ('Communication', 4),
  ('Critical Thinking', 4), ('Data Analysis', 3), ('Presentation Skills', 4),
  ('Public Relations', 3), ('Journalism', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'ryan.mccarthy@holycross.edu'
ON CONFLICT DO NOTHING;

-- Zoe Washington (English, Track & Field) — Writing + Marketing
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Content Writing', 5), ('Copywriting', 5), ('Social Media Marketing', 4),
  ('Journalism', 4), ('Photography', 3), ('Communication', 5),
  ('Digital Marketing', 3), ('Canva', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'zoe.washington@holycross.edu'
ON CONFLICT DO NOTHING;

-- Liam Fitzpatrick (Political Science) — Policy + Government
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Policy Research', 5), ('Communication', 5), ('Data Analysis', 3),
  ('Content Writing', 4), ('Leadership', 4), ('Presentation Skills', 5),
  ('Negotiation', 3), ('Critical Thinking', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'liam.fitzpatrick@holycross.edu'
ON CONFLICT DO NOTHING;

-- Priya Sharma (Mathematics) — Quantitative Analysis
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Statistics', 5), ('R', 5), ('Python', 4),
  ('Data Analysis', 5), ('Mathematics', 5), ('Excel/Google Sheets', 5),
  ('Machine Learning', 3), ('Econometrics', 4)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'priya.sharma@holycross.edu'
ON CONFLICT DO NOTHING;

-- Tyler Jackson (Sociology, Football WR) — Social Research
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Communication', 3), ('Teamwork', 5), ('Data Analysis', 2),
  ('Leadership', 3), ('Time Management', 4), ('Adaptability', 5),
  ('Qualitative Analysis', 3), ('Survey Design', 2)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'tyler.jackson.hcp@holycross.edu'
ON CONFLICT DO NOTHING;

-- Megan Sullivan (Psychology) — Program Evaluation
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('SPSS', 4), ('Survey Design', 5), ('Program Evaluation', 4),
  ('Data Analysis', 4), ('Content Writing', 4), ('Qualitative Analysis', 4),
  ('Communication', 4), ('Presentation Skills', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'megan.sullivan@holycross.edu'
ON CONFLICT DO NOTHING;

-- Andre Thompson (Philosophy, Rowing) — Ethics + Critical Thinking
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Critical Thinking', 5), ('Content Writing', 4), ('Communication', 4),
  ('Leadership', 4), ('Teamwork', 5), ('Problem Solving', 4),
  ('Negotiation', 3), ('Policy Research', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'andre.thompson@holycross.edu'
ON CONFLICT DO NOTHING;

-- Chloe Nguyen (Biology) — Lab Research + Healthcare
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('Biology', 5), ('Scientific Writing', 4), ('Data Analysis', 4),
  ('Statistics', 3), ('Chemistry', 4), ('Critical Thinking', 4),
  ('Communication', 3), ('Excel/Google Sheets', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'chloe.nguyen@holycross.edu'
ON CONFLICT DO NOTHING;

-- Daniel Morales (Economics) — Econometrics + Policy
INSERT INTO user_skills (user_id, skill_id, proficiency_level)
SELECT u.id, s.id, v.level
FROM users u CROSS JOIN (VALUES
  ('R', 4), ('Stata', 4), ('Excel/Google Sheets', 5),
  ('Data Analysis', 4), ('Econometrics', 4), ('Statistics', 4),
  ('Market Research', 3), ('Communication', 3)
) AS v(skill_name, level)
JOIN skills s ON s.name = v.skill_name
WHERE u.email = 'daniel.morales@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. EMPLOYER USERS (corporate_partner role)
-- ============================================================================
INSERT INTO users (
  email, first_name, last_name, role, tenant_id, is_active,
  password_hash, company_name, job_title, bio, email_verified
)
SELECT
  v.email, v.first_name, v.last_name, 'corporate_partner', t.id, true,
  crypt('HCPilot2026!', gen_salt('bf', 10)),
  v.company, v.title, v.bio, true
FROM tenants t
CROSS JOIN (VALUES
  -- 1. MassMutual
  ('recruiting@massmutual-hcpilot.example.com', 'Jennifer', 'Walsh',
   'MassMutual', 'Campus Recruiting Manager',
   'MassMutual is a leading mutual life insurance company founded in 1851. With over 10,000 employees, we offer financial planning, insurance, and investment services. Our Springfield and Boston offices actively recruit from top New England liberal arts colleges.'),

  -- 2. Fidelity Investments
  ('campus@fidelity-hcpilot.example.com', 'Michael', 'Torres',
   'Fidelity Investments', 'University Relations Director',
   'Fidelity Investments is one of the world''s largest asset management firms with over 70,000 employees. We manage $11+ trillion in assets and are committed to developing the next generation of financial services leaders.'),

  -- 3. UMass Memorial Health
  ('talent@umassmemorial-hcpilot.example.com', 'Sarah', 'O''Connor',
   'UMass Memorial Health', 'Talent Acquisition Specialist',
   'UMass Memorial Health is the largest healthcare system in Central Massachusetts with over 14,000 employees. We are an academic medical center committed to advancing healthcare through research, education, and clinical excellence.'),

  -- 4. Hanover Insurance Group
  ('hr@hanover-hcpilot.example.com', 'Robert', 'Kim',
   'Hanover Insurance Group', 'Early Talent Programs Manager',
   'The Hanover Insurance Group is a leading property and casualty company headquartered in Worcester, MA. With 4,500+ employees, we provide personal and commercial insurance solutions across the country.'),

  -- 5. Worcester Regional Chamber of Commerce
  ('director@worcesterchamber-hcpilot.example.com', 'Maria', 'Gonzalez',
   'Worcester Regional Chamber of Commerce', 'Programs Director',
   'The Worcester Regional Chamber of Commerce supports over 2,000 member businesses and drives economic development in Central Massachusetts. We connect businesses, advocate for growth, and celebrate Worcester''s vibrant community.'),

  -- 6. Bioventus
  ('recruiting@bioventus-hcpilot.example.com', 'Dr. James', 'Park',
   'Bioventus', 'Talent Development Lead',
   'Bioventus is a global leader in orthobiologics and medical devices, dedicated to helping patients resume active lives. With 1,000+ employees, we develop innovative solutions in regenerative medicine and surgical recovery.'),

  -- 7. Catholic Charities Worcester
  ('programs@catholiccharities-hcpilot.example.com', 'Sister Margaret', 'Doyle',
   'Catholic Charities Worcester', 'Program Director',
   'Catholic Charities Worcester serves the most vulnerable members of our community through refugee resettlement, food assistance, youth mentoring, and social services. Rooted in Catholic social teaching, we serve people of all faiths and backgrounds.'),

  -- 8. Raytheon / RTX
  ('university@rtx-hcpilot.example.com', 'Kevin', 'Pham',
   'RTX (Raytheon)', 'University Programs Coordinator',
   'RTX (formerly Raytheon Technologies) is a premier aerospace and defense company with 180,000+ employees worldwide. Our Waltham and Worcester facilities focus on advanced technology, cybersecurity, and defense systems.'),

  -- 9. Worcester Business Journal
  ('editor@wbj-hcpilot.example.com', 'Catherine', 'Murphy',
   'Worcester Business Journal', 'Managing Editor',
   'The Worcester Business Journal is the region''s leading source of business news, covering the Central Massachusetts economy, entrepreneurship, and community development since 1980.'),

  -- 10. City of Worcester
  ('workforce@worcesterma-hcpilot.example.com', 'Anthony', 'Nguyen',
   'City of Worcester', 'Director of Workforce Development',
   'The City of Worcester is the second-largest city in New England with a population of 206,000. The Mayor''s Office drives initiatives in economic development, housing, public safety, and community engagement.')

) AS v(email, first_name, last_name, company, title, bio)
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 8. PROJECT LISTINGS (15 projects)
-- ============================================================================
-- Use relative timestamps so data always appears fresh

-- 8a. PUBLISHED / OPEN projects (8)
INSERT INTO listings (
  title, description, category, skills_required, hours_per_week, compensation,
  duration, remote_allowed, status, is_paid, max_students,
  author_id, tenant_id, listing_type, published_at, created_at
)
SELECT
  v.title, v.description, v.category, v.skills::jsonb, v.hours, v.comp,
  v.duration, v.remote, 'published', v.paid, v.max_students,
  u.id, t.id, 'project', NOW() - (v.pub_days || ' days')::interval, NOW() - (v.pub_days || ' days')::interval
FROM tenants t
CROSS JOIN (VALUES
  -- 1. MassMutual — Q3 Market Research Analysis
  ('recruiting@massmutual-hcpilot.example.com',
   'Q3 Market Research Analysis',
   'Analyze consumer insurance trends for the Gen Z market entry. Research purchasing behaviors, competitor positioning, and digital distribution channels. Deliver a comprehensive report with data-backed recommendations.',
   'Business Strategy',
   '["Market Research", "Data Analysis", "Excel/Google Sheets", "Communication"]',
   10, 'Paid - $20/hr', '6 weeks', true, true, 2, 5),

  -- 2. Worcester Chamber — Social Media Content Strategy
  ('director@worcesterchamber-hcpilot.example.com',
   'Social Media Content Strategy',
   'Develop a 3-month social media calendar promoting Worcester small businesses across Instagram, LinkedIn, and X. Create content themes, draft sample posts, and define KPI tracking metrics.',
   'Marketing & Communications',
   '["Social Media Marketing", "Copywriting", "Canva", "Digital Marketing"]',
   8, 'Unpaid (portfolio credit)', '4 weeks', true, false, 1, 8),

  -- 3. UMass Memorial — Patient Satisfaction Data Dashboard
  ('talent@umassmemorial-hcpilot.example.com',
   'Patient Satisfaction Data Dashboard',
   'Build a Tableau dashboard visualizing patient experience survey data across 5 hospital departments. Clean and transform survey datasets, create interactive visualizations, and prepare executive summary slides.',
   'Data & AI',
   '["Tableau", "SQL", "Statistics", "Data Analysis"]',
   12, 'Paid - $22/hr', '5 weeks', false, true, 1, 3),

  -- 4. City of Worcester — Legislative Policy Brief: MA Housing
  ('workforce@worcesterma-hcpilot.example.com',
   'Legislative Policy Brief: MA Housing',
   'Research and draft a policy brief on Worcester housing affordability, analyzing current zoning regulations, market trends, and best practices from comparable cities. Present findings to the Mayor''s policy team.',
   'Business Strategy',
   '["Policy Research", "Content Writing", "Data Analysis", "Presentation Skills"]',
   10, 'Paid - $18/hr', '4 weeks', false, true, 1, 6),

  -- 5. Catholic Charities — Youth Mentorship Program Evaluation
  ('programs@catholiccharities-hcpilot.example.com',
   'Youth Mentorship Program Evaluation',
   'Assess outcomes of the afterschool mentorship program using pre/post survey analysis. Design evaluation instruments, analyze quantitative and qualitative data, and write recommendations report for funders.',
   'Business & Finance',
   '["Survey Design", "SPSS", "Program Evaluation", "Content Writing"]',
   8, 'Unpaid (community service credit)', '6 weeks', false, false, 2, 10),

  -- 6. Fidelity — Investment Portfolio Risk Report
  ('campus@fidelity-hcpilot.example.com',
   'Investment Portfolio Risk Report',
   'Assist the risk management team in preparing quarterly risk assessment documentation. Analyze portfolio exposure across asset classes, run scenario models, and compile findings into institutional-grade reports.',
   'Finance',
   '["Financial Modeling", "Excel/Google Sheets", "Data Analysis", "Content Writing"]',
   15, 'Paid - $25/hr', '5 weeks', true, true, 1, 4),

  -- 7. RTX/Raytheon — Cybersecurity Awareness Training Module
  ('university@rtx-hcpilot.example.com',
   'Cybersecurity Awareness Training Module',
   'Develop an interactive training module on phishing and social engineering for internal employee education. Research current threat vectors, design engaging content, and build an assessment quiz.',
   'Technology',
   '["Cybersecurity", "Instructional Design", "Communication", "Presentation Skills"]',
   10, 'Paid - $22/hr', '4 weeks', true, true, 1, 7),

  -- 8. Worcester Chamber — Economic Impact Analysis: Worcester Arts District
  ('director@worcesterchamber-hcpilot.example.com',
   'Economic Impact Analysis: Worcester Arts District',
   'Quantify the economic impact of the new arts district on local businesses using survey data, foot traffic analytics, and regional economic indicators. Deliver a presentation-ready report with visualizations.',
   'Business Strategy',
   '["Econometrics", "Statistics", "R", "Data Analysis"]',
   12, 'Paid - $20/hr', '6 weeks', false, true, 1, 9)

) AS v(employer_email, title, description, category, skills, hours, comp, duration, remote, paid, max_students, pub_days)
JOIN users u ON u.email = v.employer_email AND u.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;

-- 8b. IN-PROGRESS projects (4) — status 'published' with accepted applications
INSERT INTO listings (
  title, description, category, skills_required, hours_per_week, compensation,
  duration, remote_allowed, status, is_paid, max_students, students_accepted,
  author_id, tenant_id, listing_type, published_at, created_at
)
SELECT
  v.title, v.description, v.category, v.skills::jsonb, v.hours, v.comp,
  v.duration, v.remote, 'published', v.paid, v.max_students, v.accepted,
  u.id, t.id, 'project', NOW() - (v.pub_days || ' days')::interval, NOW() - (v.pub_days || ' days')::interval
FROM tenants t
CROSS JOIN (VALUES
  -- 9. UMass Memorial — Digital Health Literacy Campaign
  ('talent@umassmemorial-hcpilot.example.com',
   'Digital Health Literacy Campaign',
   'Design patient education materials for diverse community health outreach targeting non-English speaking populations. Create culturally appropriate infographics, flyers, and a digital resource guide.',
   'Marketing & Communications',
   '["Health Communication", "Graphic Design", "Spanish", "Communication"]',
   10, 'Paid - $18/hr', '4 weeks', false, true, 1, 1, 28),

  -- 10. Hanover Insurance — Claims Process Optimization Study
  ('hr@hanover-hcpilot.example.com',
   'Claims Process Optimization Study',
   'Map and analyze the auto claims workflow for efficiency improvements. Conduct stakeholder interviews, document current-state processes, identify bottlenecks, and propose lean solutions with projected time savings.',
   'Business Strategy',
   '["Process Mapping", "Excel/Google Sheets", "Data Analysis", "Communication"]',
   12, 'Paid - $20/hr', '6 weeks', false, true, 1, 1, 35),

  -- 11. WBJ — Feature Article Series: Worcester Entrepreneurs
  ('editor@wbj-hcpilot.example.com',
   'Feature Article Series: Worcester Entrepreneurs',
   'Report and write a 4-part feature series profiling the Worcester startup ecosystem. Identify subjects, conduct interviews, write publication-ready articles, and provide supporting photography.',
   'Marketing & Communications',
   '["Journalism", "Content Writing", "Interviewing", "Photography"]',
   10, 'Paid - $15/hr', '8 weeks', true, true, 1, 1, 42),

  -- 12. Bioventus — Mobile App UX Research
  ('recruiting@bioventus-hcpilot.example.com',
   'Mobile App UX Research',
   'Conduct user testing sessions and compile UX findings for a patient wellness mobile app. Recruit 10+ test participants, run structured usability sessions, and deliver a findings report with design recommendations.',
   'Design & Product',
   '["UX Research", "Figma", "User Research", "Communication"]',
   10, 'Paid - $22/hr', '4 weeks', true, true, 1, 1, 25)

) AS v(employer_email, title, description, category, skills, hours, comp, duration, remote, paid, max_students, accepted, pub_days)
JOIN users u ON u.email = v.employer_email AND u.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;

-- 8c. COMPLETED projects (3) — status 'closed'
INSERT INTO listings (
  title, description, category, skills_required, hours_per_week, compensation,
  duration, remote_allowed, status, is_paid, max_students, students_accepted,
  author_id, tenant_id, listing_type, published_at, closed_at, created_at
)
SELECT
  v.title, v.description, v.category, v.skills::jsonb, v.hours, v.comp,
  v.duration, v.remote, 'closed', v.paid, v.max_students, v.accepted,
  u.id, t.id, 'project',
  NOW() - (v.pub_days || ' days')::interval,
  NOW() - (v.close_days || ' days')::interval,
  NOW() - (v.pub_days || ' days')::interval
FROM tenants t
CROSS JOIN (VALUES
  -- 13. Catholic Charities — Nonprofit Annual Report Design
  ('programs@catholiccharities-hcpilot.example.com',
   'Nonprofit Annual Report Design',
   'Designed and wrote the 2026 annual report highlighting program outcomes, financial transparency, and community impact. Produced a 24-page professionally designed document using Adobe InDesign.',
   'Design & Product',
   '["Graphic Design", "Content Writing", "Adobe InDesign", "Data Visualization"]',
   10, 'Unpaid (portfolio credit)', '5 weeks', false, false, 1, 1, 75, 40),

  -- 14. Hanover Insurance — Supply Chain Sustainability Audit
  ('hr@hanover-hcpilot.example.com',
   'Supply Chain Sustainability Audit',
   'Evaluated vendor sustainability practices against ESG criteria. Reviewed 30+ supplier questionnaires, scored against a custom framework, and delivered a compliance dashboard with remediation priorities.',
   'Business Strategy',
   '["Data Analysis", "Excel/Google Sheets", "Market Research", "Content Writing"]',
   10, 'Paid - $20/hr', '5 weeks', false, true, 1, 1, 90, 55),

  -- 15. Holy Cross Internal — Alumni Engagement Survey Analysis
  ('admin@holycross-pilot.proveground.com',
   'Alumni Engagement Survey Analysis',
   'Analyzed annual alumni engagement data across 5 years, identified trends in giving, event attendance, and career mentoring. Presented findings to the Advancement Office with recommendations for improving alumni participation rates.',
   'Data & AI',
   '["SPSS", "Data Visualization", "Statistics", "Presentation Skills"]',
   8, 'Internal project', '3 weeks', false, false, 1, 1, 60, 38)

) AS v(employer_email, title, description, category, skills, hours, comp, duration, remote, paid, max_students, accepted, pub_days, close_days)
JOIN users u ON u.email = v.employer_email AND u.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. PROJECT APPLICATIONS — Full Lifecycle
-- ============================================================================

-- 9a. COMPLETED applications (for the 3 closed projects)

-- Zoe Washington completed "Nonprofit Annual Report Design" (Catholic Charities)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  s.id, l.id, cp.id, 'Catholic Charities Worcester', cp.email,
  'Zoe Washington', s.email, l.title,
  'As an English major with three years of writing center experience, I bring strong editorial skills and a keen eye for visual storytelling. I have experience with Adobe InDesign from my work on the college newspaper and can handle both the writing and design aspects of the annual report.',
  'I want to use my writing skills to support a mission-driven organization. Creating a document that helps Catholic Charities communicate their impact to donors aligns with my interest in purpose-driven communications.',
  '["Content Writing", "Graphic Design", "Adobe InDesign", "Communication"]'::jsonb,
  'ENGL 301 Advanced Expository Writing, ART 220 Visual Communication',
  10, 'Available immediately', 'student', 'completed',
  NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days', NOW() - INTERVAL '68 days', NOW() - INTERVAL '40 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Nonprofit Annual Report Design' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'programs@catholiccharities-hcpilot.example.com'
WHERE s.email = 'zoe.washington@holycross.edu'
ON CONFLICT DO NOTHING;

-- Gabriela Santos completed "Supply Chain Sustainability Audit" (Hanover)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  s.id, l.id, cp.id, 'Hanover Insurance Group', cp.email,
  'Gabriela Santos', s.email, l.title,
  'My Economics coursework in environmental economics combined with my experience on the Sustainability Club gives me a unique perspective on ESG analysis. As a rower, I understand the importance of systematic discipline — I will bring that same rigor to evaluating vendor sustainability practices.',
  'Sustainability is central to my career goals. This project lets me apply economic analysis to real corporate ESG challenges while building my consulting portfolio.',
  '["Data Analysis", "Excel/Google Sheets", "Market Research", "Communication"]'::jsonb,
  'ECON 290 Environmental Economics, ECON 310 Industrial Organization',
  10, 'Available after rowing season', 'student', 'completed',
  NOW() - INTERVAL '85 days', NOW() - INTERVAL '82 days', NOW() - INTERVAL '82 days', NOW() - INTERVAL '55 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Supply Chain Sustainability Audit' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'hr@hanover-hcpilot.example.com'
WHERE s.email = 'gabriela.santos@holycross.edu'
ON CONFLICT DO NOTHING;

-- Megan Sullivan completed "Alumni Engagement Survey Analysis" (Internal)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  s.id, l.id, cp.id, 'College of the Holy Cross', cp.email,
  'Megan Sullivan', s.email, l.title,
  'My Psychology research background in survey methodology and SPSS makes me well-suited for this analysis project. I have experience with longitudinal data analysis and presenting findings to non-technical audiences.',
  'As a senior, I want to give back to Holy Cross by helping the Advancement Office better understand alumni engagement patterns. This also strengthens my program evaluation skills for grad school applications.',
  '["SPSS", "Data Analysis", "Statistics", "Presentation Skills"]'::jsonb,
  'PSYCH 301 Research Methods, PSYCH 320 Applied Statistics, MATH 220 Statistics',
  8, 'Available immediately', 'student', 'completed',
  NOW() - INTERVAL '55 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days', NOW() - INTERVAL '38 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Alumni Engagement Survey Analysis' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'admin@holycross-pilot.proveground.com'
WHERE s.email = 'megan.sullivan@holycross.edu'
ON CONFLICT DO NOTHING;

-- 9b. ACCEPTED applications (in-progress projects)

-- Sofia Reyes accepted for "Digital Health Literacy Campaign" (UMass Memorial)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  s.id, l.id, cp.id, 'UMass Memorial Health', cp.email,
  'Sofia Reyes', s.email, l.title,
  'As a bilingual Political Science major, I understand the intersection of policy and community health. My fluency in Spanish and experience with community organizing make me uniquely qualified to create culturally appropriate health materials for Worcester''s diverse population.',
  'This project combines my language skills with my commitment to health equity. I want to help bridge the communication gap that prevents non-English speakers from accessing critical health information.',
  '["Spanish", "Communication", "Content Writing", "Leadership"]'::jsonb,
  'POLS 280 Public Policy, SOC 250 Race and Ethnicity',
  10, 'Available after soccer season', 'student', 'accepted',
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Digital Health Literacy Campaign' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'talent@umassmemorial-hcpilot.example.com'
WHERE s.email = 'sofia.reyes@holycross.edu'
ON CONFLICT DO NOTHING;

-- Marcus Williams accepted for "Claims Process Optimization Study" (Hanover)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  s.id, l.id, cp.id, 'Hanover Insurance Group', cp.email,
  'Marcus Williams', s.email, l.title,
  'My Economics training in process optimization and data analysis, combined with my leadership experience on the basketball court, make me a strong fit for this consulting engagement. I thrive in structured analytical work that requires both quantitative skills and clear communication.',
  'Insurance operations is a field I''m exploring for post-graduation careers. This hands-on process improvement project will give me real consulting experience with a Worcester-based Fortune 1000 company.',
  '["Data Analysis", "Excel/Google Sheets", "Communication", "Strategic Thinking"]'::jsonb,
  'ECON 310 Industrial Organization, ECON 280 Operations Research',
  12, 'Available outside basketball practice hours', 'student', 'accepted',
  NOW() - INTERVAL '32 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Claims Process Optimization Study' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'hr@hanover-hcpilot.example.com'
WHERE s.email = 'marcus.williams.hcp@holycross.edu'
ON CONFLICT DO NOTHING;

-- Zoe Washington accepted for "Feature Article Series" (WBJ)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  s.id, l.id, cp.id, 'Worcester Business Journal', cp.email,
  'Zoe Washington', s.email, l.title,
  'As editor of the college newspaper and an English major with a passion for storytelling, I have extensive experience in deadline-driven journalism. I''ve interviewed subjects ranging from college presidents to local business owners, and my writing has been published in multiple campus and regional outlets.',
  'Worcester''s startup ecosystem is a story that deserves to be told well. I want to develop my business journalism skills while contributing meaningful coverage of the local economy.',
  '["Journalism", "Content Writing", "Interviewing", "Photography"]'::jsonb,
  'ENGL 310 Feature Writing, COMM 280 Multimedia Journalism',
  10, 'Available immediately', 'student', 'accepted',
  NOW() - INTERVAL '38 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Feature Article Series: Worcester Entrepreneurs' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'editor@wbj-hcpilot.example.com'
WHERE s.email = 'zoe.washington@holycross.edu'
ON CONFLICT DO NOTHING;

-- Aisha Patel accepted for "Mobile App UX Research" (Bioventus)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  s.id, l.id, cp.id, 'Bioventus', cp.email,
  'Aisha Patel', s.email, l.title,
  'My Psychology research in cognitive science gives me a strong foundation in understanding user behavior and designing research protocols. I have experience running structured interviews, analyzing behavioral data, and presenting findings. I''m eager to apply these skills to UX research in a healthcare context.',
  'UX research bridges my psychology training with product design. This project lets me work on a real healthcare app where good UX directly impacts patient outcomes.',
  '["UX Research", "Survey Design", "Qualitative Analysis", "Communication"]'::jsonb,
  'PSYCH 301 Research Methods, PSYCH 340 Cognitive Psychology',
  10, 'Available immediately', 'student', 'accepted',
  NOW() - INTERVAL '22 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Mobile App UX Research' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'recruiting@bioventus-hcpilot.example.com'
WHERE s.email = 'aisha.patel@holycross.edu'
ON CONFLICT DO NOTHING;

-- 9c. PENDING applications (new interest)

-- Priya Sharma applied to "Investment Portfolio Risk Report" (Fidelity)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'Fidelity Investments', cp.email,
  'Priya Sharma', s.email, l.title,
  'As a Mathematics major with a 3.9 GPA, I have extensive experience with statistical modeling and quantitative analysis. My research assistant work involves building regression models and Monte Carlo simulations in R, which directly applies to portfolio risk assessment.',
  'Fidelity is my top employer target. This project gives me hands-on experience in quantitative finance that will strengthen both my resume and my understanding of the industry.',
  '["Statistics", "R", "Data Analysis", "Excel/Google Sheets"]'::jsonb,
  'MATH 330 Probability, MATH 340 Mathematical Statistics, ECON 250 Econometrics',
  15, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '3 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Investment Portfolio Risk Report' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'campus@fidelity-hcpilot.example.com'
WHERE s.email = 'priya.sharma@holycross.edu'
ON CONFLICT DO NOTHING;

-- Daniel Morales applied to "Economic Impact Analysis" (Chamber)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'Worcester Regional Chamber of Commerce', cp.email,
  'Daniel Morales', s.email, l.title,
  'My econometrics training at Holy Cross has given me hands-on experience with regional economic modeling in R and Stata. As a first-generation college student from Worcester, I have a personal connection to understanding how arts and culture investment drives local economic growth.',
  'I grew up in Worcester and have seen the city transform. Quantifying the economic impact of the arts district would be deeply meaningful to me, and it directly applies my econometrics skills.',
  '["Econometrics", "R", "Statistics", "Data Analysis"]'::jsonb,
  'ECON 350 Econometrics, ECON 320 Urban Economics, ECON 280 Public Finance',
  12, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '2 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Economic Impact Analysis: Worcester Arts District' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'director@worcesterchamber-hcpilot.example.com'
WHERE s.email = 'daniel.morales@holycross.edu'
ON CONFLICT DO NOTHING;

-- Liam Fitzpatrick applied to "Legislative Policy Brief" (City of Worcester)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'City of Worcester', cp.email,
  'Liam Fitzpatrick', s.email, l.title,
  'As Student Government President and a Political Science major who interned at the Massachusetts State House, I have direct experience in policy research and legislative analysis. My thesis on municipal governance in Massachusetts gives me deep knowledge of the state''s housing policy landscape.',
  'Government service is my calling. This project lets me contribute to one of Worcester''s most pressing challenges while building my policy analysis portfolio for future public service work.',
  '["Policy Research", "Content Writing", "Data Analysis", "Presentation Skills"]'::jsonb,
  'POLS 350 American Public Policy, POLS 310 State & Local Government, ECON 240 Urban Economics',
  10, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '4 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Legislative Policy Brief: MA Housing' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'workforce@worcesterma-hcpilot.example.com'
WHERE s.email = 'liam.fitzpatrick@holycross.edu'
ON CONFLICT DO NOTHING;

-- David Chen applied to "Cybersecurity Awareness Training" (RTX)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'RTX (Raytheon)', cp.email,
  'David Chen', s.email, l.title,
  'As a Computer Science major, I have a strong foundation in network security fundamentals and have completed coursework in cybersecurity. I''m also passionate about education — as CS Club President, I run weekly workshops teaching programming to beginners.',
  'Cybersecurity is a growing interest of mine. This project combines my technical knowledge with my teaching experience to create something that protects real employees from real threats.',
  '["Python", "Communication", "HTML/CSS", "Presentation Skills"]'::jsonb,
  'CS 310 Computer Networks, CS 325 Cybersecurity Fundamentals',
  10, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '1 day'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Cybersecurity Awareness Training Module' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'university@rtx-hcpilot.example.com'
WHERE s.email = 'david.chen.hcp@holycross.edu'
ON CONFLICT DO NOTHING;

-- Chloe Nguyen applied to "Patient Satisfaction Data Dashboard" (UMass Memorial)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'UMass Memorial Health', cp.email,
  'Chloe Nguyen', s.email, l.title,
  'My Biology coursework has given me experience analyzing large datasets and presenting scientific findings. I have skills in statistical analysis and data visualization, and I''m learning Tableau through online courses. As a volunteer EMT, I understand the patient experience firsthand.',
  'Healthcare is my career path, and I want to understand it from the operational side as well as the clinical side. Patient satisfaction data tells important stories about care quality.',
  '["Data Analysis", "Statistics", "Scientific Writing", "Excel/Google Sheets"]'::jsonb,
  'BIOL 310 Biostatistics, MATH 220 Statistics, BIOL 250 Research Methods',
  12, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '2 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Patient Satisfaction Data Dashboard' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'talent@umassmemorial-hcpilot.example.com'
WHERE s.email = 'chloe.nguyen@holycross.edu'
ON CONFLICT DO NOTHING;

-- Ryan McCarthy applied to "Youth Mentorship Program Evaluation" (Catholic Charities)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'Catholic Charities Worcester', cp.email,
  'Ryan McCarthy', s.email, l.title,
  'My History training has given me strong research and writing skills, and my involvement in student government has exposed me to program evaluation from an organizational perspective. I''m passionate about youth development and have volunteered as a tutor in Worcester for two years.',
  'Catholic Charities'' mission of service resonates deeply with Holy Cross''s Jesuit values. I want to help ensure their mentorship program is making a measurable difference in young people''s lives.',
  '["Content Writing", "Data Analysis", "Communication", "Critical Thinking"]'::jsonb,
  'HIST 310 Research Methods, POLS 250 Public Administration',
  8, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '5 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Youth Mentorship Program Evaluation' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'programs@catholiccharities-hcpilot.example.com'
WHERE s.email = 'ryan.mccarthy@holycross.edu'
ON CONFLICT DO NOTHING;

-- Megan Sullivan applied to "Youth Mentorship Program Evaluation" (second student, same project)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  s.id, l.id, cp.id, 'Catholic Charities Worcester', cp.email,
  'Megan Sullivan', s.email, l.title,
  'After successfully completing the Alumni Engagement Survey Analysis project, I''m eager to apply my program evaluation expertise to a community-focused project. My SPSS and survey design skills are directly applicable to assessing mentorship outcomes, and my Psychology background helps me understand youth development frameworks.',
  'I just completed a data analysis project for Holy Cross and want to take on a community-impact evaluation. This aligns with my goal of pursuing a master''s in public health or social work.',
  '["SPSS", "Survey Design", "Program Evaluation", "Qualitative Analysis"]'::jsonb,
  'PSYCH 301 Research Methods, PSYCH 320 Program Evaluation, SOC 250 Community Organizations',
  8, 'Available immediately', 'student', 'pending',
  NOW() - INTERVAL '3 days'
FROM users s
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND s.tenant_id = t.id
JOIN listings l ON l.title = 'Youth Mentorship Program Evaluation' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'programs@catholiccharities-hcpilot.example.com'
WHERE s.email = 'megan.sullivan@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 10. CORPORATE RATINGS (students rate employers — for completed projects)
-- ============================================================================

-- Zoe Washington rates Catholic Charities (Annual Report)
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Sister Margaret and the Catholic Charities team were incredibly supportive and gave me real creative ownership over the annual report. The project pushed me to grow as both a writer and designer. Seeing the finished report used at their gala fundraiser was one of the most rewarding experiences of my college career. Highly recommend working with this organization.'
FROM project_applications pa
WHERE pa.student_email = 'zoe.washington@holycross.edu'
  AND pa.listing_title = 'Nonprofit Annual Report Design'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Gabriela Santos rates Hanover Insurance (Sustainability Audit)
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  4,
  'Robert and the Hanover team were professional and responsive. The project gave me real exposure to ESG frameworks and corporate sustainability practices. I wish there had been a bit more direct mentorship, but overall a very solid experience that strengthened my consulting skills. The compliance dashboard I built is now used by their procurement team.'
FROM project_applications pa
WHERE pa.student_email = 'gabriela.santos@holycross.edu'
  AND pa.listing_title = 'Supply Chain Sustainability Audit'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Megan Sullivan rates Holy Cross Internal (Alumni Survey)
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Working on an internal Holy Cross project felt deeply personal and meaningful. The Career Services team gave me access to 5 years of alumni data and the freedom to explore the analysis my own way. Presenting to the Advancement Office was a career highlight — they immediately implemented two of my recommendations.'
FROM project_applications pa
WHERE pa.student_email = 'megan.sullivan@holycross.edu'
  AND pa.listing_title = 'Alumni Engagement Survey Analysis'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 11. STUDENT RATINGS (employers rate students — for completed projects)
-- ============================================================================

-- Catholic Charities rates Zoe Washington
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Zoe produced an exceptional annual report that exceeded our expectations. Her writing was clear and compelling, and her design skills brought our program data to life visually. She worked independently, met every deadline, and even proposed a QR code feature for the digital version that we hadn''t considered.',
  'Outstanding writing and visual design skills. Self-directed and reliable. Excellent at translating complex program data into accessible narratives. Creative problem-solver.',
  'Could develop more experience with budget reporting and financial data presentation. Would benefit from more exposure to nonprofit fundraising strategy.',
  true
FROM project_applications pa
WHERE pa.student_email = 'zoe.washington@holycross.edu'
  AND pa.listing_title = 'Nonprofit Annual Report Design'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Hanover Insurance rates Gabriela Santos
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  4,
  'Gabriela delivered a thorough sustainability audit with a well-structured compliance dashboard. Her economics background was evident in her systematic approach to vendor scoring. She was reliable and professional throughout the engagement.',
  'Strong analytical skills and systematic approach. Excel skills are excellent. Good at understanding complex supply chain relationships. Professional communication with stakeholders.',
  'Could improve speed of initial data gathering — the first two weeks were slower than expected. Would benefit from more experience with ESG reporting frameworks like GRI and SASB.',
  true
FROM project_applications pa
WHERE pa.student_email = 'gabriela.santos@holycross.edu'
  AND pa.listing_title = 'Supply Chain Sustainability Audit'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Holy Cross rates Megan Sullivan
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Megan''s analysis of 5 years of alumni engagement data was exemplary. She identified three previously unknown correlations between early career mentoring and long-term giving patterns. Her SPSS skills are graduate-level, and her final presentation to the Advancement Office was polished and actionable.',
  'Exceptional research methodology and statistical analysis. Clear, confident presenter. Proactive about surfacing unexpected findings. Meticulous documentation of analytical process.',
  'Could expand her visualization toolkit beyond SPSS — Tableau or Power BI skills would make her insights even more impactful. Would benefit from learning SQL for direct database queries.',
  true
FROM project_applications pa
WHERE pa.student_email = 'megan.sullivan@holycross.edu'
  AND pa.listing_title = 'Alumni Engagement Survey Analysis'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 12. STUDENT SCHEDULES (for athletes)
-- ============================================================================

-- Marcus Williams — Basketball (M)
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes,
  custom_blocks, travel_conflicts)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'regular' THEN 10  WHEN 'preseason' THEN 8
    WHEN 'postseason' THEN 8 WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Basketball (M) ' || ss.season_type || ' — Patriot League',
  CASE ss.season_type
    WHEN 'regular' THEN '[{"day": "Tuesday", "startTime": "15:00", "endTime": "18:00", "label": "Practice"}, {"day": "Thursday", "startTime": "15:00", "endTime": "18:00", "label": "Practice"}]'::jsonb
    ELSE '[]'::jsonb
  END,
  CASE ss.season_type
    WHEN 'regular' THEN '[{"start": "2026-01-15", "end": "2026-01-18", "label": "Away @ Lehigh"}, {"start": "2026-02-05", "end": "2026-02-08", "label": "Away @ Bucknell"}]'::jsonb
    ELSE '[]'::jsonb
  END
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'marcus.williams.hcp@holycross.edu'
  AND ss.sport_name = 'Basketball (M)'
ON CONFLICT DO NOTHING;

-- Sofia Reyes — Soccer (W)
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'regular' THEN 10  WHEN 'preseason' THEN 6
    WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Soccer (W) ' || ss.season_type || ' — Patriot League'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'sofia.reyes@holycross.edu'
  AND ss.sport_name = 'Soccer (W)'
ON CONFLICT DO NOTHING;

-- James O'Brien — Football
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'regular' THEN 8  WHEN 'preseason' THEN 5
    WHEN 'postseason' THEN 8 WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Football ' || ss.season_type || ' — Patriot League'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'james.obrien@holycross.edu'
  AND ss.sport_name = 'Football'
ON CONFLICT DO NOTHING;

-- Gabriela Santos — Rowing
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'spring' THEN 8  WHEN 'fall' THEN 10
    WHEN 'offseason' THEN 20
    ELSE 15
  END,
  true,
  'Rowing ' || ss.season_type || ' — Lake Quinsigamond'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'gabriela.santos@holycross.edu'
  AND ss.sport_name = 'Rowing'
ON CONFLICT DO NOTHING;

-- Zoe Washington — Track & Field
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'indoor' THEN 12  WHEN 'outdoor' THEN 10
    WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Track & Field ' || ss.season_type
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'zoe.washington@holycross.edu'
  AND ss.sport_name = 'Track & Field'
ON CONFLICT DO NOTHING;

-- Tyler Jackson — Football
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'regular' THEN 8  WHEN 'preseason' THEN 5
    WHEN 'postseason' THEN 8 WHEN 'offseason' THEN 25
    ELSE 15
  END,
  true,
  'Football ' || ss.season_type || ' — Patriot League'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'tyler.jackson.hcp@holycross.edu'
  AND ss.sport_name = 'Football'
ON CONFLICT DO NOTHING;

-- Andre Thompson — Rowing
INSERT INTO student_schedules (user_id, sport_season_id, schedule_type, available_hours_per_week, is_active, notes)
SELECT u.id, ss.id, 'sport',
  CASE ss.season_type
    WHEN 'spring' THEN 8  WHEN 'fall' THEN 10
    WHEN 'offseason' THEN 20
    ELSE 15
  END,
  true,
  'Rowing ' || ss.season_type || ' — Lake Quinsigamond'
FROM users u
CROSS JOIN sport_seasons ss
WHERE u.email = 'andre.thompson@holycross.edu'
  AND ss.sport_name = 'Rowing'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 13. MATCH ENGINE CONFIG
-- ============================================================================
INSERT INTO match_engine_config (
  tenant_id, signal_weights, min_score_threshold, max_results_per_query,
  enable_athletic_transfer, enable_schedule_matching, config
)
SELECT
  id,
  '{"temporal": 0.25, "skills": 0.30, "sustainability": 0.15, "growth": 0.10, "trust": 0.10, "network": 0.10}'::jsonb,
  15.00, 100, true, true,
  '{"description": "College of the Holy Cross — Career Services Pilot — Enterprise Match Engine config"}'::jsonb
FROM tenants
WHERE subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 14. MATCH SCORES (pre-computed for demo — showcases the Match Engine)
-- ============================================================================
INSERT INTO match_scores (student_id, listing_id, tenant_id, composite_score, signal_breakdown, computation_time_ms, version)
SELECT u.id, l.id, t.id, v.score,
  jsonb_build_object(
    'temporal', jsonb_build_object('score', v.temporal, 'weight', 0.25),
    'skills', jsonb_build_object('score', v.skills, 'weight', 0.30),
    'sustainability', jsonb_build_object('score', v.sustain, 'weight', 0.15),
    'growth', jsonb_build_object('score', v.growth, 'weight', 0.10),
    'trust', jsonb_build_object('score', v.trust, 'weight', 0.10),
    'network', jsonb_build_object('score', v.ntwk, 'weight', 0.10)
  ),
  FLOOR(RANDOM() * 40 + 25)::int, 1
FROM tenants t
CROSS JOIN (VALUES
  -- Priya Sharma — top match for quantitative projects
  ('priya.sharma@holycross.edu', 'Investment Portfolio Risk Report', 93.5, 0.90, 0.96, 0.88, 0.92, 0.85, 0.95),
  ('priya.sharma@holycross.edu', 'Economic Impact Analysis: Worcester Arts District', 88.0, 0.85, 0.92, 0.82, 0.88, 0.82, 0.90),
  ('priya.sharma@holycross.edu', 'Patient Satisfaction Data Dashboard', 82.5, 0.78, 0.85, 0.80, 0.85, 0.80, 0.88),

  -- Liam Fitzpatrick — top match for policy projects
  ('liam.fitzpatrick@holycross.edu', 'Legislative Policy Brief: MA Housing', 91.0, 0.92, 0.94, 0.85, 0.88, 0.82, 0.92),
  ('liam.fitzpatrick@holycross.edu', 'Economic Impact Analysis: Worcester Arts District', 78.5, 0.80, 0.78, 0.75, 0.80, 0.78, 0.85),

  -- Marcus Williams — strong match for business/finance projects
  ('marcus.williams.hcp@holycross.edu', 'Q3 Market Research Analysis', 86.0, 0.72, 0.90, 0.82, 0.85, 0.80, 0.92),
  ('marcus.williams.hcp@holycross.edu', 'Claims Process Optimization Study', 84.5, 0.68, 0.88, 0.80, 0.82, 0.82, 0.90),
  ('marcus.williams.hcp@holycross.edu', 'Investment Portfolio Risk Report', 80.0, 0.65, 0.85, 0.78, 0.80, 0.78, 0.88),

  -- David Chen — top match for tech projects
  ('david.chen.hcp@holycross.edu', 'Cybersecurity Awareness Training Module', 87.5, 0.90, 0.92, 0.85, 0.82, 0.78, 0.88),
  ('david.chen.hcp@holycross.edu', 'Patient Satisfaction Data Dashboard', 79.0, 0.85, 0.82, 0.78, 0.75, 0.72, 0.82),

  -- Zoe Washington — top match for writing/media projects
  ('zoe.washington@holycross.edu', 'Feature Article Series: Worcester Entrepreneurs', 92.0, 0.78, 0.95, 0.88, 0.90, 0.88, 0.92),
  ('zoe.washington@holycross.edu', 'Social Media Content Strategy', 89.0, 0.80, 0.92, 0.85, 0.88, 0.85, 0.90),

  -- Megan Sullivan — strong for program evaluation
  ('megan.sullivan@holycross.edu', 'Youth Mentorship Program Evaluation', 90.0, 0.88, 0.94, 0.85, 0.88, 0.85, 0.92),

  -- Daniel Morales — strong for economics/data projects
  ('daniel.morales@holycross.edu', 'Economic Impact Analysis: Worcester Arts District', 91.5, 0.88, 0.95, 0.85, 0.90, 0.82, 0.92),
  ('daniel.morales@holycross.edu', 'Q3 Market Research Analysis', 82.0, 0.82, 0.85, 0.78, 0.80, 0.78, 0.85),

  -- Sofia Reyes — strong for community/policy projects
  ('sofia.reyes@holycross.edu', 'Digital Health Literacy Campaign', 90.5, 0.70, 0.92, 0.88, 0.92, 0.85, 0.95),
  ('sofia.reyes@holycross.edu', 'Legislative Policy Brief: MA Housing', 83.0, 0.72, 0.85, 0.80, 0.85, 0.80, 0.88),

  -- Aisha Patel — strong for research projects
  ('aisha.patel@holycross.edu', 'Mobile App UX Research', 89.0, 0.90, 0.92, 0.85, 0.88, 0.82, 0.90),
  ('aisha.patel@holycross.edu', 'Youth Mentorship Program Evaluation', 85.0, 0.88, 0.88, 0.82, 0.85, 0.80, 0.88),

  -- Andre Thompson — match for ethics/consulting
  ('andre.thompson@holycross.edu', 'Supply Chain Sustainability Audit', 76.0, 0.70, 0.78, 0.72, 0.75, 0.78, 0.85),

  -- Gabriela Santos — match for business/sustainability
  ('gabriela.santos@holycross.edu', 'Q3 Market Research Analysis', 80.5, 0.72, 0.85, 0.78, 0.80, 0.78, 0.88),

  -- Ryan McCarthy — match for community/research projects
  ('ryan.mccarthy@holycross.edu', 'Youth Mentorship Program Evaluation', 81.0, 0.85, 0.82, 0.78, 0.80, 0.78, 0.88),
  ('ryan.mccarthy@holycross.edu', 'Feature Article Series: Worcester Entrepreneurs', 78.0, 0.82, 0.80, 0.75, 0.78, 0.75, 0.82),

  -- Chloe Nguyen — match for health/data projects
  ('chloe.nguyen@holycross.edu', 'Patient Satisfaction Data Dashboard', 80.5, 0.88, 0.82, 0.78, 0.80, 0.78, 0.85)

) AS v(student_email, listing_title, score, temporal, skills, sustain, growth, trust, ntwk)
JOIN users u ON u.email = v.student_email AND u.tenant_id = t.id
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 15. CORPORATE ATTRACTIVENESS SCORES
-- ============================================================================
INSERT INTO corporate_attractiveness_scores (listing_id, author_id, tenant_id, attractiveness_score, signal_breakdown, sample_size)
SELECT l.id, l.author_id, t.id, v.score,
  jsonb_build_object(
    'compensation', v.comp, 'flexibility', v.flex,
    'growth_opportunity', v.growth, 'brand_reputation', v.brand
  ),
  v.samples
FROM tenants t
CROSS JOIN (VALUES
  ('Q3 Market Research Analysis', 80.0, 0.72, 0.85, 0.82, 0.88, 4),
  ('Investment Portfolio Risk Report', 92.0, 0.95, 0.80, 0.92, 0.95, 5),
  ('Patient Satisfaction Data Dashboard', 84.0, 0.78, 0.65, 0.85, 0.90, 3),
  ('Legislative Policy Brief: MA Housing', 75.0, 0.68, 0.60, 0.78, 0.80, 3),
  ('Youth Mentorship Program Evaluation', 68.0, 0.40, 0.65, 0.75, 0.85, 2),
  ('Social Media Content Strategy', 62.0, 0.35, 0.88, 0.70, 0.72, 2),
  ('Cybersecurity Awareness Training Module', 86.0, 0.78, 0.85, 0.88, 0.92, 4),
  ('Economic Impact Analysis: Worcester Arts District', 78.0, 0.72, 0.65, 0.80, 0.82, 3),
  ('Digital Health Literacy Campaign', 74.0, 0.68, 0.62, 0.80, 0.90, 3),
  ('Claims Process Optimization Study', 79.0, 0.72, 0.55, 0.82, 0.88, 3),
  ('Feature Article Series: Worcester Entrepreneurs', 71.0, 0.55, 0.85, 0.78, 0.75, 2),
  ('Mobile App UX Research', 83.0, 0.78, 0.80, 0.85, 0.82, 3),
  ('Nonprofit Annual Report Design', 65.0, 0.35, 0.65, 0.78, 0.85, 2),
  ('Supply Chain Sustainability Audit', 77.0, 0.72, 0.55, 0.80, 0.88, 3),
  ('Alumni Engagement Survey Analysis', 70.0, 0.50, 0.70, 0.75, 0.82, 2)
) AS v(listing_title, score, comp, flex, growth, brand, samples)
JOIN listings l ON l.title = v.listing_title AND l.tenant_id = t.id
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 16. STUDENT PORTFOLIOS (for students with completed or in-progress work)
-- ============================================================================
INSERT INTO student_portfolios (student_id, slug, display_name, headline, bio, theme, is_public, show_readiness_score, show_skill_chart, view_count)
SELECT u.id, v.slug, v.display_name, v.headline, v.bio, 'professional', true, true, true, v.views
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-pilot' AND u.tenant_id = t.id
CROSS JOIN (VALUES
  ('zoe.washington@holycross.edu', 'zoe-washington-2026', 'Zoe Washington',
   'Writer & Communicator | Track & Field Sprinter',
   'Senior English major and sprinter at Holy Cross. I''ve written and designed a nonprofit annual report for Catholic Charities Worcester and I''m currently writing a feature article series for the Worcester Business Journal. My work demonstrates that exceptional storytelling and athletic discipline go hand in hand.',
   42),
  ('gabriela.santos@holycross.edu', 'gabriela-santos-2026', 'Gabriela Santos',
   'Economics & Sustainability | Varsity Rower',
   'Senior Economics major and rower on Lake Quinsigamond. My completed sustainability audit for Hanover Insurance demonstrated my ability to deliver rigorous consulting work on tight timelines. I bring the same discipline from 5 AM practices to every project.',
   28),
  ('megan.sullivan@holycross.edu', 'megan-sullivan-2026', 'Megan Sullivan',
   'Psychology & Program Evaluation',
   'Senior Psychology major with a passion for data-driven program evaluation. Completed an alumni engagement analysis for Holy Cross that led to immediate policy changes. My SPSS skills, research methodology expertise, and commitment to evidence-based practice set me apart.',
   35),
  ('marcus.williams.hcp@holycross.edu', 'marcus-williams-hcp-2026', 'Marcus Williams',
   'Economics & Analytics | Basketball Guard',
   'Senior Economics major and starting guard on the Holy Cross basketball team. Currently completing a claims process optimization study for Hanover Insurance. I bring the same competitive intensity and analytical mindset from the court to every consulting engagement.',
   22),
  ('sofia.reyes@holycross.edu', 'sofia-reyes-2027', 'Sofia Reyes',
   'Political Science & Community Health | Women''s Soccer',
   'Junior Political Science major and women''s soccer midfielder. Currently developing bilingual health literacy materials for UMass Memorial Health. Passionate about health equity and community empowerment.',
   18),
  ('aisha.patel@holycross.edu', 'aisha-patel-2027', 'Aisha Patel',
   'Psychology & UX Research',
   'Junior Psychology major conducting UX research for Bioventus on a patient wellness app. My cognitive science background and structured research methodology bring rigor to understanding user behavior.',
   15)
) AS v(email, slug, display_name, headline, bio, views)
WHERE u.email = v.email
ON CONFLICT (student_id) DO NOTHING;


-- ============================================================================
-- 17. PORTFOLIO PROJECTS (link completed listings to portfolios)
-- ============================================================================

-- Zoe Washington — Nonprofit Annual Report Design
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'Designing the 2026 annual report for Catholic Charities was transformative. I wrote compelling narratives around program outcomes while creating data visualizations that made complex impact data accessible. The finished 24-page report was featured at their annual gala and helped secure a major donor commitment. Sister Margaret said it was the best annual report in the organization''s history.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'zoe.washington@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-pilot'
JOIN listings l ON l.title = 'Nonprofit Annual Report Design' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- Gabriela Santos — Supply Chain Sustainability Audit
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'Evaluating 30+ suppliers against ESG criteria pushed me to think systematically about sustainability in corporate supply chains. The compliance dashboard I built in Excel is now used by Hanover''s procurement team for quarterly vendor assessments. This project confirmed that I want to pursue a career at the intersection of economics and sustainability.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'gabriela.santos@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-pilot'
JOIN listings l ON l.title = 'Supply Chain Sustainability Audit' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- Megan Sullivan — Alumni Engagement Survey Analysis
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'Analyzing 5 years of alumni data revealed three correlations that the Advancement Office had never identified. The most impactful finding was that early career mentoring in the first 5 years post-graduation was the strongest predictor of long-term alumni giving. The Advancement Office immediately implemented a targeted early-career mentoring program based on my recommendation.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'megan.sullivan@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-pilot'
JOIN listings l ON l.title = 'Alumni Engagement Survey Analysis' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 18. PORTFOLIO BADGES
-- ============================================================================

-- Zoe Washington badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first ProveGround project"}', (NOW() - INTERVAL '40 days')::text),
  ('top_performer', 'Top Performer', '{"description": "Received a 5-star rating from Catholic Charities Worcester", "project": "Nonprofit Annual Report Design"}', (NOW() - INTERVAL '38 days')::text),
  ('skill_verified', 'Skill Verified: Content Writing', '{"description": "Content Writing verified through project completion", "skill_area": "Content Writing"}', (NOW() - INTERVAL '35 days')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'zoe.washington@holycross.edu'
ON CONFLICT DO NOTHING;

-- Gabriela Santos badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first ProveGround project"}', (NOW() - INTERVAL '55 days')::text),
  ('skill_verified', 'Skill Verified: Data Analysis', '{"description": "Data Analysis verified through ESG supply chain audit", "skill_area": "Data Analysis"}', (NOW() - INTERVAL '50 days')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'gabriela.santos@holycross.edu'
ON CONFLICT DO NOTHING;

-- Megan Sullivan badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first ProveGround project"}', (NOW() - INTERVAL '38 days')::text),
  ('top_performer', 'Top Performer', '{"description": "Received a 5-star rating for Alumni Engagement Survey Analysis", "project": "Alumni Engagement Survey Analysis"}', (NOW() - INTERVAL '36 days')::text),
  ('skill_verified', 'Skill Verified: SPSS', '{"description": "SPSS skills verified through alumni data analysis project", "skill_area": "SPSS"}', (NOW() - INTERVAL '34 days')::text),
  ('employer_endorsed', 'Employer Endorsed', '{"description": "Recommended for future work by Career Services", "endorser": "HC Career Services Admin"}', (NOW() - INTERVAL '35 days')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'megan.sullivan@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 19. SKILL VERIFICATION (upgrade completed project students' skills)
-- ============================================================================

-- Zoe Washington — Content Writing verified via Annual Report
UPDATE user_skills SET
  verification_source = 'project_completion',
  verified_at = NOW() - INTERVAL '38 days',
  evidence_notes = 'Verified through delivery of Nonprofit Annual Report Design for Catholic Charities Worcester (5-star rating)'
FROM users u
WHERE user_skills.user_id = u.id AND u.email = 'zoe.washington@holycross.edu'
  AND user_skills.skill_id = (SELECT id FROM skills WHERE name = 'Content Writing' LIMIT 1);

-- Zoe Washington — Graphic Design endorsed by employer
UPDATE user_skills SET
  verification_source = 'employer_endorsement',
  verified_at = NOW() - INTERVAL '38 days',
  evidence_notes = 'Endorsed by Sister Margaret Doyle (Catholic Charities): "Exceptional visual design and layout skills"'
FROM users u
WHERE user_skills.user_id = u.id AND u.email = 'zoe.washington@holycross.edu'
  AND user_skills.skill_id = (SELECT id FROM skills WHERE name = 'Canva' LIMIT 1);

-- Gabriela Santos — Data Analysis verified via Sustainability Audit
UPDATE user_skills SET
  verification_source = 'project_completion',
  verified_at = NOW() - INTERVAL '52 days',
  evidence_notes = 'Verified through delivery of Supply Chain Sustainability Audit for Hanover Insurance (4-star rating)'
FROM users u
WHERE user_skills.user_id = u.id AND u.email = 'gabriela.santos@holycross.edu'
  AND user_skills.skill_id = (SELECT id FROM skills WHERE name = 'Data Analysis' LIMIT 1);

-- Megan Sullivan — SPSS verified via Alumni Survey Analysis
UPDATE user_skills SET
  verification_source = 'project_completion',
  verified_at = NOW() - INTERVAL '36 days',
  evidence_notes = 'Verified through delivery of Alumni Engagement Survey Analysis (5-star rating, led to immediate policy changes)'
FROM users u
WHERE user_skills.user_id = u.id AND u.email = 'megan.sullivan@holycross.edu'
  AND user_skills.skill_id = (SELECT id FROM skills WHERE name = 'SPSS' LIMIT 1);

-- Megan Sullivan — Survey Design endorsed
UPDATE user_skills SET
  verification_source = 'employer_endorsement',
  verified_at = NOW() - INTERVAL '36 days',
  evidence_notes = 'Endorsed by HC Career Services: "Graduate-level research methodology and statistical analysis skills"'
FROM users u
WHERE user_skills.user_id = u.id AND u.email = 'megan.sullivan@holycross.edu'
  AND user_skills.skill_id = (SELECT id FROM skills WHERE name = 'Survey Design' LIMIT 1);


-- ============================================================================
-- 20. OUTCOME METRICS (pre-computed for the dashboard)
-- ============================================================================
INSERT INTO outcome_metrics (
  institution_id, metric_type, metric_value, metric_metadata, period_start, period_end
)
SELECT
  t.id,
  v.key, v.value, v.meta::jsonb, v.period_start::date, v.period_end::date
FROM tenants t
CROSS JOIN (VALUES
  ('total_projects_completed', 3.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"source": "pilot_seed"}'),
  ('project_completion_rate', 92.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"completed": 3, "total_accepted": 3, "note": "100% completion among accepted applications"}'),
  ('avg_student_rating', 4.67, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"ratings_count": 3, "breakdown": {"5_star": 2, "4_star": 1}}'),
  ('avg_employer_satisfaction', 4.67, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"ratings_count": 3, "breakdown": {"5_star": 2, "4_star": 1}}'),
  ('time_to_first_match', 3.2, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"unit": "days", "sample_size": 7}'),
  ('active_students', 12.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"total_students": 15, "activation_rate": 0.80}'),
  ('active_employers', 8.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"total_employers": 10}'),
  ('projects_this_semester', 15.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"open": 8, "in_progress": 4, "completed": 3}'),
  ('skills_verified_count', 5.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"top_skills": ["Content Writing", "Data Analysis", "SPSS", "Survey Design", "Canva"]}'),
  ('student_activation_rate', 80.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"active": 12, "total": 15}'),
  ('employer_engagement_count', 8.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"with_listings": 8, "total": 10}'),
  ('repeat_employer_rate', 40.0, (NOW() - INTERVAL '90 days')::text, NOW()::text, '{"repeat": 4, "total": 10, "employers": ["Hanover Insurance", "Catholic Charities", "UMass Memorial", "Worcester Chamber"]}')
) AS v(key, value, period_start, period_end, meta)
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 21. ACADEMIC CALENDAR (for the Holy Cross pilot tenant)
-- ============================================================================
INSERT INTO academic_calendars (tenant_id, term_name, term_type, start_date, end_date, is_break, priority_level, academic_year, notes)
SELECT t.id, v.term_name, 'semester', v.start_date::date, v.end_date::date, v.is_break, v.priority, '2025-2026', v.notes
FROM tenants t
CROSS JOIN (VALUES
  ('Fall 2025', '2025-08-28', '2025-12-12', false, 4, 'Fall semester classes'),
  ('Thanksgiving Break', '2025-11-26', '2025-11-30', true, 1, 'Thanksgiving recess'),
  ('Winter Break', '2025-12-13', '2026-01-14', true, 1, 'Winter recess'),
  ('Spring 2026', '2026-01-15', '2026-05-08', false, 4, 'Spring semester classes'),
  ('Spring Break', '2026-03-07', '2026-03-15', true, 1, 'Spring recess'),
  ('Summer 2026', '2026-05-15', '2026-08-20', true, 2, 'Summer — available for projects')
) AS v(term_name, start_date, end_date, is_break, priority, notes)
WHERE t.subdomain = 'holy-cross-pilot'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 22. APPLICATION MESSAGES (sample conversation threads)
-- ============================================================================

-- Marcus Williams ↔ Hanover Insurance (Claims Process Optimization)
INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, cp.id, 'Robert Kim', 'corporate',
  'Welcome to the team, Marcus! I''m excited to have you on the Claims Process Optimization Study. I''ll set up a kickoff meeting for next Monday where we''ll walk you through the current claims workflow and introduce you to the operations team. In the meantime, I''m sending you our process documentation and some background on our auto claims volume.',
  'user', pa.responded_at + INTERVAL '2 hours'
FROM project_applications pa
JOIN users cp ON cp.email = 'hr@hanover-hcpilot.example.com'
WHERE pa.student_email = 'marcus.williams.hcp@holycross.edu'
  AND pa.listing_title = 'Claims Process Optimization Study'
  AND pa.status = 'accepted'
ON CONFLICT DO NOTHING;

INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, s.id, 'Marcus Williams', 'student',
  'Thank you, Robert! I''m looking forward to the kickoff. I''ve already started reviewing some process mapping methodologies and will come prepared with a framework for our first session. Quick question — will I have access to historical claims data, or will the analysis be based primarily on stakeholder interviews?',
  'user', pa.responded_at + INTERVAL '1 day'
FROM project_applications pa
JOIN users s ON s.email = 'marcus.williams.hcp@holycross.edu'
WHERE pa.student_email = 'marcus.williams.hcp@holycross.edu'
  AND pa.listing_title = 'Claims Process Optimization Study'
  AND pa.status = 'accepted'
ON CONFLICT DO NOTHING;

-- Zoe Washington ↔ WBJ (Feature Article Series)
INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, cp.id, 'Catherine Murphy', 'corporate',
  'Zoe, welcome aboard! We''re thrilled to have a Holy Cross English major writing for us. The Worcester startup scene is really heating up and we want this series to capture that energy. I''ve compiled a list of 12 potential subjects — let''s narrow it down to 4 together. Can you come to the office Thursday afternoon for a brainstorm session?',
  'user', pa.responded_at + INTERVAL '3 hours'
FROM project_applications pa
JOIN users cp ON cp.email = 'editor@wbj-hcpilot.example.com'
WHERE pa.student_email = 'zoe.washington@holycross.edu'
  AND pa.listing_title = 'Feature Article Series: Worcester Entrepreneurs'
  AND pa.status = 'accepted'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done — Holy Cross Pilot Tenant is fully provisioned
-- ============================================================================
-- Summary:
--   Institution: holycross.edu (College of the Holy Cross)
--   Tenant: holy-cross-pilot (Enterprise, institution marketplace)
--   Admin: admin@holycross-pilot.proveground.com / HolyCrossPilot2026!
--   Students: 15 (diverse majors, 6 student-athletes)
--   Employers: 10 (Worcester/Boston corridor)
--   Projects: 15 (8 open, 4 in-progress, 3 completed)
--   Applications: 3 completed, 4 accepted, 7 pending
--   Ratings: 3 bilateral (student ↔ employer)
--   Portfolios: 6 students with profiles, 3 with featured projects
--   Match Scores: 25 pre-computed matches
--   Badges: 9 earned badges
--   Outcome Metrics: 12 dashboard KPIs
-- ============================================================================
