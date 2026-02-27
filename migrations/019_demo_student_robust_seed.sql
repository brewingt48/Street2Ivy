-- ============================================================
-- Migration 019: Demo Student — Robust Data Seeding
-- ============================================================
-- Seeds the demo student (demo-student@holycross.edu) with:
--   1. user_skills       — 14 skills across multiple categories
--   2. project_applications — 3 completed + 1 accepted + 1 pending
--   3. student_portfolios — professional portfolio
--   4. portfolio_projects — completed projects showcased
--   5. portfolio_badges   — earned achievement badges
--   6. Updated skill_gap_snapshot — improved readiness score
-- ============================================================
-- Idempotent: uses ON CONFLICT DO NOTHING and conditional deletes.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_tenant_id   uuid;
  v_student_id  uuid := 'e97b82ce-9020-45bd-91bf-3527c8041ef9';
  v_portfolio_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE subdomain = 'holy-cross-pilot';
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'holy-cross-pilot tenant not found — skipping';
    RETURN;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 1. USER SKILLS  (14 skills, mix of verified & self-reported)
  -- ──────────────────────────────────────────────────────────
  -- Composite PK (user_id, skill_id), so ON CONFLICT handles idempotency.

  -- Communication — level 4, verified through project completion (Survey Analysis)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '960b1d85-bfc8-4847-8ffd-4323b2b88afa', 4, 'project_completion',
          '70c5abda-e263-4037-9325-2d6e47b4816f', NOW() - INTERVAL '14 days',
          'Led stakeholder interviews and presented survey findings to Holy Cross alumni office')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Data Analysis — level 3, verified through project completion (Survey Analysis)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '77cf5519-ee46-4eef-a6cf-184256c959a4', 3, 'project_completion',
          '70c5abda-e263-4037-9325-2d6e47b4816f', NOW() - INTERVAL '14 days',
          'Analyzed 500+ survey responses using SPSS and Excel, identified key engagement trends')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Excel/Google Sheets — level 3, verified through project completion (Supply Chain Audit)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '66e79dcf-9ffa-4ca7-aab9-71917b4e21a8', 3, 'project_completion',
          'f6e315d3-4598-4851-bb29-2831a4fcba18', NOW() - INTERVAL '30 days',
          'Built comprehensive supply chain tracking spreadsheets with pivot tables and VLOOKUP formulas')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- SQL — level 2, self-reported (still a gap)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, 'd9f227f2-0b4b-4d4a-a38f-6001af22be8a', 2, 'self_reported',
          'Completed intro database course, comfortable with SELECT/JOIN/GROUP BY queries')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Business Strategy — level 2, self-reported (gap area)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, '14675dc6-1aab-4854-ab3d-83ec7281b3d7', 2, 'self_reported',
          'Economics major with coursework in microeconomics and business strategy')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Presentation Skills — level 3, verified through project completion (Annual Report)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, 'b4958588-7445-4940-addb-2fbcb26c0a74', 3, 'project_completion',
          '4dc9a775-cab2-4bff-b129-9cec9113d5e1', NOW() - INTERVAL '21 days',
          'Presented final annual report design to Catholic Charities board of directors')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Problem Solving — level 3, self-reported
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, '003bbe7b-ba0f-40b4-a46e-0fe50e2473a8', 3, 'self_reported',
          'Developed creative solutions for supply chain inefficiencies during Hanover Insurance project')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Critical Thinking — level 3, self-reported
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, '3bb345a3-b54f-42aa-a874-2bab19675e24', 3, 'self_reported',
          'Strong analytical background through economics curriculum and data-driven projects')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Project Management — level 2, self-reported
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, 'd05bd288-dc56-4b1d-a068-965200e60b5b', 2, 'self_reported',
          'Coordinated team deliverables and timelines across 3 completed client projects')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Market Research — level 2, verified through project completion (Supply Chain Audit)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '028c82c1-5b41-4b08-bae5-3874e5d6a4b7', 2, 'project_completion',
          'f6e315d3-4598-4851-bb29-2831a4fcba18', NOW() - INTERVAL '30 days',
          'Researched vendor sustainability practices and benchmarked against industry standards')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Survey Design — level 3, verified through project completion (Alumni Survey)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '00d91249-73f7-41bb-b7ea-8e5ed8945a7f', 3, 'project_completion',
          '70c5abda-e263-4037-9325-2d6e47b4816f', NOW() - INTERVAL '14 days',
          'Designed Likert-scale and open-ended survey instrument distributed to 1,200 alumni')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Process Mapping — level 2, verified through project completion (Supply Chain Audit)
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, project_id, verified_at, evidence_notes)
  VALUES (v_student_id, '0356e897-671d-49ff-9160-04c758fc1b1c', 2, 'project_completion',
          'f6e315d3-4598-4851-bb29-2831a4fcba18', NOW() - INTERVAL '30 days',
          'Mapped end-to-end procurement workflows and identified 3 sustainability bottlenecks')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Leadership — level 2, self-reported
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, '5ee761e7-2df1-4a67-9eb9-864c2213ce52', 2, 'self_reported',
          'Captain of intramural volleyball team, economics club treasurer')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Teamwork — level 3, self-reported
  INSERT INTO user_skills (user_id, skill_id, proficiency_level, verification_source, evidence_notes)
  VALUES (v_student_id, 'c0b75eb9-c78f-4a19-b464-927a9129d0c1', 3, 'self_reported',
          'Collaborated effectively in all 3 completed client projects with cross-functional teams')
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  RAISE NOTICE 'Inserted 14 user_skills for demo student';


  -- ──────────────────────────────────────────────────────────
  -- 2. PROJECT APPLICATIONS  (3 completed, 1 accepted, 1 pending)
  -- ──────────────────────────────────────────────────────────
  -- Delete existing demo student applications (idempotent re-run)
  DELETE FROM project_applications WHERE student_id = v_student_id;

  -- COMPLETED: Supply Chain Sustainability Audit (Hanover Insurance Group)
  INSERT INTO project_applications (
    id, student_id, listing_id, corporate_id, corporate_name, corporate_email,
    student_name, student_email, listing_title, cover_letter,
    interest_reason, skills, relevant_coursework, gpa, hours_per_week,
    status, initiated_by, submitted_at, responded_at, completed_at
  ) VALUES (
    'd0190001-0001-4000-8000-000000000001', v_student_id,
    'f6e315d3-4598-4851-bb29-2831a4fcba18',
    'd3b683cf-39bc-4183-8b23-4d229ec6895c',
    'Hanover Insurance Group', 'employer2@holycross-pilot.proveground.com',
    'Demo Student', 'demo-student@holycross.edu',
    'Supply Chain Sustainability Audit',
    'I am eager to apply my economics training to real-world sustainability challenges. My coursework in environmental economics and data analysis has prepared me to evaluate supply chain practices through both a quantitative and ethical lens.',
    'Passionate about the intersection of business operations and environmental sustainability',
    '["Excel/Google Sheets", "Data Analysis", "Process Mapping", "Market Research"]'::jsonb,
    'Environmental Economics, Microeconomics, Statistics I & II',
    '3.65', 15,
    'completed', 'student',
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '30 days'
  );

  -- COMPLETED: Nonprofit Annual Report Design (Catholic Charities Worcester)
  INSERT INTO project_applications (
    id, student_id, listing_id, corporate_id, corporate_name, corporate_email,
    student_name, student_email, listing_title, cover_letter,
    interest_reason, skills, relevant_coursework, gpa, hours_per_week,
    status, initiated_by, submitted_at, responded_at, completed_at
  ) VALUES (
    'd0190001-0002-4000-8000-000000000002', v_student_id,
    '4dc9a775-cab2-4bff-b129-9cec9113d5e1',
    'b3d00a61-0012-4222-a986-dd3ee7fd40ad',
    'Catholic Charities Worcester', 'employer4@holycross-pilot.proveground.com',
    'Demo Student', 'demo-student@holycross.edu',
    'Nonprofit Annual Report Design',
    'As an economics major with a strong interest in the nonprofit sector, I would love the opportunity to help Catholic Charities communicate their impact through a compelling annual report. I have experience with data visualization and storytelling.',
    'Want to combine analytical skills with creative communication for social impact',
    '["Communication", "Presentation Skills", "Data Analysis"]'::jsonb,
    'Principles of Accounting, Business Communications, Design Thinking',
    '3.65', 10,
    'completed', 'student',
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days', NOW() - INTERVAL '21 days'
  );

  -- COMPLETED: Alumni Engagement Survey Analysis (Holy Cross internal)
  INSERT INTO project_applications (
    id, student_id, listing_id, corporate_id, corporate_name, corporate_email,
    student_name, student_email, listing_title, cover_letter,
    interest_reason, skills, relevant_coursework, gpa, hours_per_week,
    status, initiated_by, submitted_at, responded_at, completed_at
  ) VALUES (
    'd0190001-0003-4000-8000-000000000003', v_student_id,
    '70c5abda-e263-4037-9325-2d6e47b4816f',
    'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
    'College of the Holy Cross', 'admin@holycross-pilot.proveground.com',
    'Demo Student', 'demo-student@holycross.edu',
    'Alumni Engagement Survey Analysis',
    'I am excited to contribute to Holy Cross institutional research by analyzing alumni engagement patterns. My statistics coursework and familiarity with SPSS make me well-suited to extract actionable insights from survey data.',
    'Passionate about using data to strengthen the Holy Cross alumni community',
    '["Survey Design", "Data Analysis", "Communication", "Excel/Google Sheets"]'::jsonb,
    'Statistics I & II, Research Methods, Econometrics',
    '3.65', 12,
    'completed', 'corporate',
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '14 days'
  );

  -- ACCEPTED (in-progress): Q3 Market Research Analysis (MassMutual)
  INSERT INTO project_applications (
    id, student_id, listing_id, corporate_id, corporate_name, corporate_email,
    student_name, student_email, listing_title, cover_letter,
    interest_reason, skills, relevant_coursework, gpa, hours_per_week,
    status, initiated_by, submitted_at, responded_at
  ) VALUES (
    'd0190001-0004-4000-8000-000000000004', v_student_id,
    '4efecb9e-d2e5-4100-be2f-8374846eac01',
    '464e46be-9b54-4ed3-aed6-19c8f2181559',
    'MassMutual', 'employer7@holycross-pilot.proveground.com',
    'Demo Student', 'demo-student@holycross.edu',
    'Q3 Market Research Analysis',
    'With three completed projects under my belt and a growing specialization in data analysis, I am ready to take on this market research challenge at MassMutual. My experience with survey design and quantitative analysis aligns perfectly with this opportunity.',
    'Aspiring to build a career in financial services and business analytics',
    '["Market Research", "Data Analysis", "Excel/Google Sheets", "Communication"]'::jsonb,
    'Financial Markets, Econometrics, Consumer Behavior',
    '3.65', 15,
    'accepted', 'student',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'
  );

  -- PENDING: Economic Impact Analysis (Worcester Regional Chamber of Commerce)
  INSERT INTO project_applications (
    id, student_id, listing_id, corporate_id, corporate_name, corporate_email,
    student_name, student_email, listing_title, cover_letter,
    interest_reason, skills, relevant_coursework, gpa, hours_per_week,
    status, initiated_by, submitted_at
  ) VALUES (
    'd0190001-0005-4000-8000-000000000005', v_student_id,
    'f0c08d5b-b741-45b1-9370-14e1dbc038b6',
    '49c6d6ed-a77e-4e5f-a8b2-94242b9e05f2',
    'Worcester Regional Chamber of Commerce', 'employer5@holycross-pilot.proveground.com',
    'Demo Student', 'demo-student@holycross.edu',
    'Economic Impact Analysis: Worcester Arts District',
    'As a Worcester-area student passionate about economic development, I am eager to analyze the economic impact of the arts district on the local community. My completed projects in data analysis and survey research have prepared me for this kind of rigorous economic study.',
    'Committed to understanding and improving the economic vitality of the Worcester community',
    '["Data Analysis", "Excel/Google Sheets", "Market Research", "Communication"]'::jsonb,
    'Macroeconomics, Urban Economics, Applied Econometrics',
    '3.65', 12,
    'pending', 'student',
    NOW() - INTERVAL '2 days'
  );

  RAISE NOTICE 'Inserted 5 project_applications for demo student';


  -- ──────────────────────────────────────────────────────────
  -- 3. STUDENT PORTFOLIO
  -- ──────────────────────────────────────────────────────────
  -- Delete existing portfolio (cascade deletes projects & views)
  DELETE FROM student_portfolios WHERE student_id = v_student_id;

  INSERT INTO student_portfolios (
    id, student_id, slug, display_name, headline, bio, theme,
    is_public, show_readiness_score, show_skill_chart, view_count
  ) VALUES (
    'd0190002-0001-4000-8000-000000000001',
    v_student_id,
    'demo-student-2027',
    'Demo Student',
    'Economics Major | Aspiring Business Analyst',
    'Economics major at the College of the Holy Cross with hands-on experience in market research, data analysis, and nonprofit consulting through ProveGround projects. Passionate about using quantitative methods to drive strategic business decisions. Completed three client projects with organizations including Hanover Insurance Group, Catholic Charities Worcester, and the Holy Cross alumni office.',
    'professional',
    true, true, true, 8
  );

  v_portfolio_id := 'd0190002-0001-4000-8000-000000000001';
  RAISE NOTICE 'Created student portfolio';


  -- ──────────────────────────────────────────────────────────
  -- 4. PORTFOLIO PROJECTS (link completed projects)
  -- ──────────────────────────────────────────────────────────

  -- Featured: Alumni Engagement Survey Analysis (most recent completion)
  INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
  VALUES (
    v_portfolio_id,
    '70c5abda-e263-4037-9325-2d6e47b4816f',
    1, true,
    'This was my most impactful project. I designed a comprehensive survey instrument that was distributed to 1,200 alumni, then analyzed the responses to identify key engagement trends. The findings directly informed Holy Cross''s alumni outreach strategy for the coming year. I developed strong skills in survey methodology, statistical analysis, and stakeholder communication.'
  ) ON CONFLICT DO NOTHING;

  -- Featured: Supply Chain Sustainability Audit
  INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
  VALUES (
    v_portfolio_id,
    'f6e315d3-4598-4851-bb29-2831a4fcba18',
    2, true,
    'Working with Hanover Insurance Group gave me invaluable exposure to corporate sustainability practices. I mapped end-to-end procurement workflows, identified three major sustainability bottlenecks, and presented data-driven recommendations to the supply chain team. This project strengthened my Excel skills and taught me how to translate complex data into actionable business insights.'
  ) ON CONFLICT DO NOTHING;

  -- Nonprofit Annual Report Design
  INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
  VALUES (
    v_portfolio_id,
    '4dc9a775-cab2-4bff-b129-9cec9113d5e1',
    3, false,
    'Collaborating with Catholic Charities Worcester was a deeply meaningful experience. I helped synthesize their annual impact data into a visually compelling report, combining quantitative metrics with human stories. Presenting the final design to their board of directors was a highlight of my academic career.'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Inserted 3 portfolio projects';


  -- ──────────────────────────────────────────────────────────
  -- 5. PORTFOLIO BADGES
  -- ──────────────────────────────────────────────────────────
  DELETE FROM portfolio_badges WHERE student_id = v_student_id;

  -- First Project Completed
  INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
  VALUES (
    v_student_id, 'first_project', 'First Project Completed',
    '{"projectTitle": "Supply Chain Sustainability Audit", "companyName": "Hanover Insurance Group"}'::jsonb,
    NOW() - INTERVAL '30 days'
  );

  -- Three Projects Completed
  INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
  VALUES (
    v_student_id, 'projects_milestone', '3 Projects Completed',
    '{"milestone": 3, "latestProject": "Alumni Engagement Survey Analysis"}'::jsonb,
    NOW() - INTERVAL '14 days'
  );

  -- Skill Verified Through Work
  INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
  VALUES (
    v_student_id, 'skill_verified', 'Skill Verified Through Work',
    '{"skillName": "Data Analysis", "verificationSource": "project_completion"}'::jsonb,
    NOW() - INTERVAL '14 days'
  );

  -- Portfolio Published
  INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
  VALUES (
    v_student_id, 'portfolio_published', 'Portfolio Published',
    '{"portfolioSlug": "demo-student-2027"}'::jsonb,
    NOW() - INTERVAL '10 days'
  );

  -- Multi-Sector Experience (worked across insurance, nonprofit, education)
  INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
  VALUES (
    v_student_id, 'multi_sector', 'Multi-Sector Experience',
    '{"sectors": ["Insurance", "Nonprofit", "Higher Education"], "projectCount": 3}'::jsonb,
    NOW() - INTERVAL '14 days'
  );

  RAISE NOTICE 'Inserted 5 portfolio badges';


  -- ──────────────────────────────────────────────────────────
  -- 6. PORTFOLIO VIEWS (realistic engagement)
  -- ──────────────────────────────────────────────────────────
  DELETE FROM portfolio_views WHERE portfolio_id = v_portfolio_id;

  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT v_portfolio_id,
    (ARRAY['employer','employer','student','anonymous','employer','student','educational_admin'])[1 + (g % 7)],
    NOW() - (g * 4 || ' hours')::interval
  FROM generate_series(1, 8) AS g;

  RAISE NOTICE 'Inserted 8 portfolio views';


  -- ──────────────────────────────────────────────────────────
  -- 7. UPDATE SKILL GAP SNAPSHOT
  -- ──────────────────────────────────────────────────────────
  -- Now that the demo student has real skills and completed projects,
  -- update the readiness score from 35 (Building) → 65 (Demonstrating).
  -- Gaps narrowed: SQL still a gap (2 vs 3 required), Business Strategy (2 vs 3).
  -- Strengths grown: Communication, Presentation Skills, Problem Solving exceed.

  DELETE FROM skill_gap_snapshots WHERE student_id = v_student_id;

  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  VALUES (
    v_student_id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd',  -- Business Analyst
    65.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":2,"gapSeverity":"minor","recommendedProjects":["Patient Satisfaction Data Dashboard","Investment Portfolio Risk Report"]},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":2,"gapSeverity":"minor","recommendedProjects":["Claims Process Optimization Study","Economic Impact Analysis: Worcester Arts District"]},
      {"skillId":"fdbbeaf3-6227-4061-8dba-ea76e8486ca1","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant","recommendedProjects":["Mobile App UX Research","Cybersecurity Awareness Training Module"]}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":3,"exceedsBy":0},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":3,"exceedsBy":0},
      {"skillId":"b4958588-7445-4940-addb-2fbcb26c0a74","verifiedLevel":3,"exceedsBy":1},
      {"skillId":"003bbe7b-ba0f-40b4-a46e-0fe50e2473a8","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  );

  RAISE NOTICE 'Updated skill_gap_snapshot: score 35 → 65 (Demonstrating)';


  -- ──────────────────────────────────────────────────────────
  -- 8. CLEAN STALE OUTCOME METRICS (force recompute)
  -- ──────────────────────────────────────────────────────────
  DELETE FROM outcome_metrics WHERE institution_id = v_tenant_id;
  RAISE NOTICE 'Cleared stale outcome_metrics — will recompute on next access';

END;
$$;

COMMIT;
