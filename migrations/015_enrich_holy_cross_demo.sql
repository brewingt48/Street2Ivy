-- Migration 015: Enrich Holy Cross Demo Data
-- Makes the Marcus Williams portfolio robust and fully populated for customer demos.

-- Variables used throughout
-- Marcus: 3968ba5e-605e-437e-a040-849f34e1909d
-- Portfolio: 37a27590-37dc-4f61-a24a-7ad473060844
-- Tenant: f4260dd3-20a2-45fd-a0c5-aea412ec2263

-- =====================================================================
-- 1. COMPLETE MORE PROJECTS FOR MARCUS
-- =====================================================================

-- Complete the Market Analysis (currently pending → completed)
UPDATE project_applications
SET status = 'completed', updated_at = NOW() - INTERVAL '10 days'
WHERE student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND listing_id = 'd45ecdcd-db73-4bfc-9175-48a4c23cd206'
  AND status = 'pending';

-- Add application + complete for Market Research: Emerging B2B SaaS Trends (Crusader Ventures)
INSERT INTO project_applications (id, listing_id, student_id, status, cover_letter, submitted_at, updated_at)
VALUES (
  gen_random_uuid(),
  '55f10e5e-b0e2-41ef-846c-c5fbe9996e1c',
  '3968ba5e-605e-437e-a040-849f34e1909d',
  'completed',
  'I''m excited to apply my market research and data analysis skills to explore emerging B2B SaaS trends. My background in finance gives me a strong analytical foundation for evaluating market dynamics.',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '14 days'
) ON CONFLICT DO NOTHING;

-- Add application + complete for Leadership Workshop Curriculum Development (Johnson Consulting)
INSERT INTO project_applications (id, listing_id, student_id, status, cover_letter, submitted_at, updated_at)
VALUES (
  gen_random_uuid(),
  '39130891-36cf-4315-9a5a-04b8aef1c0e3',
  '3968ba5e-605e-437e-a040-849f34e1909d',
  'completed',
  'As a team captain and quarterback, I''ve spent years developing leadership skills through both practice and game-time decisions. I''d love to help develop a curriculum that bridges athletic leadership with professional development.',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '25 days'
) ON CONFLICT DO NOTHING;

-- =====================================================================
-- 2. ADD CORPORATE RATINGS FOR NEW COMPLETED PROJECTS
-- =====================================================================

-- Rating for Market Analysis: Patriot League NIL Landscape (from Mark Johnson)
INSERT INTO corporate_ratings (id, application_id, student_id, listing_id, corporate_id, project_title, rating, review_text, created_at)
SELECT gen_random_uuid(),
       pa.id,
       '3968ba5e-605e-437e-a040-849f34e1909d',
       'd45ecdcd-db73-4bfc-9175-48a4c23cd206',
       u.id,
       'Market Analysis: Patriot League NIL Landscape',
       5,
       'Marcus delivered an exceptionally thorough NIL landscape analysis. His understanding of both the collegiate athletic and business dimensions made his insights uniquely valuable. The final report was board-ready. Could further develop his data visualization skills.',
       NOW() - INTERVAL '8 days'
FROM users u
CROSS JOIN project_applications pa
WHERE u.email = 'mark@johnsonconsulting.example.com'
  AND pa.student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND pa.listing_id = 'd45ecdcd-db73-4bfc-9175-48a4c23cd206'
ON CONFLICT DO NOTHING;

-- Rating for Market Research: Emerging B2B SaaS Trends (from Sarah Williams at Crusader Ventures)
INSERT INTO corporate_ratings (id, application_id, student_id, listing_id, corporate_id, project_title, rating, review_text, created_at)
SELECT gen_random_uuid(),
       pa.id,
       '3968ba5e-605e-437e-a040-849f34e1909d',
       '55f10e5e-b0e2-41ef-846c-c5fbe9996e1c',
       u.id,
       'Market Research: Emerging B2B SaaS Trends',
       4,
       'Strong analytical mindset. Marcus quickly grasped complex SaaS metrics and delivered a well-structured competitive analysis. His finance background gave him an edge in evaluating unit economics. Would benefit from deeper exposure to product-market fit evaluation frameworks.',
       NOW() - INTERVAL '12 days'
FROM users u
CROSS JOIN project_applications pa
WHERE u.email = 'sarah@crusaderventures.example.com'
  AND pa.student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND pa.listing_id = '55f10e5e-b0e2-41ef-846c-c5fbe9996e1c'
ON CONFLICT DO NOTHING;

-- Rating for Leadership Workshop (from Mark Johnson)
INSERT INTO corporate_ratings (id, application_id, student_id, listing_id, corporate_id, project_title, rating, review_text, created_at)
SELECT gen_random_uuid(),
       pa.id,
       '3968ba5e-605e-437e-a040-849f34e1909d',
       '39130891-36cf-4315-9a5a-04b8aef1c0e3',
       u.id,
       'Leadership Workshop Curriculum Development',
       5,
       'Marcus brought genuine leadership credibility that made the workshop content authentic. His ability to translate game-day decision-making into professional leadership frameworks was outstanding. The curriculum he designed has already been adopted by two of our client organizations. One of the strongest deliverables we''ve received.',
       NOW() - INTERVAL '22 days'
FROM users u
CROSS JOIN project_applications pa
WHERE u.email = 'mark@johnsonconsulting.example.com'
  AND pa.student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND pa.listing_id = '39130891-36cf-4315-9a5a-04b8aef1c0e3'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 3. ADD PORTFOLIO PROJECTS (showcase in the portfolio)
-- =====================================================================

-- Add Market Analysis: Patriot League NIL Landscape to portfolio
INSERT INTO portfolio_projects (id, portfolio_id, project_id, display_order, is_featured, student_reflection, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '37a27590-37dc-4f61-a24a-7ad473060844',
  'd45ecdcd-db73-4bfc-9175-48a4c23cd206',
  2,
  true,
  'Analyzing the NIL landscape across the Patriot League forced me to think like both an athlete and a business strategist. I interviewed 15 student-athletes across 6 schools and built a comprehensive framework for evaluating NIL deal structures. The most rewarding part was seeing conference administrators reference our findings in policy discussions.',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
) ON CONFLICT DO NOTHING;

-- Add Market Research: Emerging B2B SaaS Trends to portfolio
INSERT INTO portfolio_projects (id, portfolio_id, project_id, display_order, is_featured, student_reflection, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '37a27590-37dc-4f61-a24a-7ad473060844',
  '55f10e5e-b0e2-41ef-846c-c5fbe9996e1c',
  3,
  false,
  'Working with Crusader Ventures opened my eyes to the VC world. I analyzed 40+ B2B SaaS companies across five verticals, evaluating their unit economics, growth trajectories, and competitive positioning. The framework I built is now part of their standard deal evaluation process.',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
) ON CONFLICT DO NOTHING;

-- Add Leadership Workshop Curriculum to portfolio
INSERT INTO portfolio_projects (id, portfolio_id, project_id, display_order, is_featured, student_reflection, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '37a27590-37dc-4f61-a24a-7ad473060844',
  '39130891-36cf-4315-9a5a-04b8aef1c0e3',
  4,
  false,
  'Designing a leadership workshop curriculum let me formalize everything I''ve learned as a team captain into a structured program. I created a 6-module curriculum that bridges athletic leadership with corporate leadership skills, complete with case studies drawn from real game situations. Two organizations have already adopted the curriculum.',
  NOW() - INTERVAL '22 days',
  NOW() - INTERVAL '22 days'
) ON CONFLICT DO NOTHING;

-- =====================================================================
-- 4. FIX BADGE TYPES (replace invalid types with valid icon-mapped types)
-- =====================================================================

-- Replace 'five_star' → 'top_performer' (purple trophy icon)
UPDATE portfolio_badges
SET badge_type = 'top_performer',
    badge_label = 'Top Performer',
    badge_metadata = jsonb_build_object(
      'description', 'Received a perfect 5-star rating from a corporate partner',
      'project', 'Financial Model for Alumni Venture Fund'
    )
WHERE student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND badge_type = 'five_star';

-- Replace 'finance_pro' → 'skill_verified' (blue shield icon)
UPDATE portfolio_badges
SET badge_type = 'skill_verified',
    badge_label = 'Finance Expert',
    badge_metadata = jsonb_build_object(
      'description', 'Financial modeling skills verified through project delivery',
      'skill_area', 'Financial Modeling'
    )
WHERE student_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND badge_type = 'finance_pro';

-- Add more badges for the additional completed projects
INSERT INTO portfolio_badges (id, student_id, badge_type, badge_label, badge_metadata, earned_at)
VALUES
  -- Employer endorsed badge (from multiple positive reviews)
  (gen_random_uuid(), '3968ba5e-605e-437e-a040-849f34e1909d', 'employer_endorsed', 'Employer Endorsed',
   '{"description": "Recommended for future work by multiple corporate partners", "count": 3}'::jsonb,
   NOW() - INTERVAL '8 days'),
  -- Project milestone badge (3 projects completed)
  (gen_random_uuid(), '3968ba5e-605e-437e-a040-849f34e1909d', 'project_milestone', '3 Projects Completed',
   '{"description": "Successfully completed three Proveground projects", "count": 3}'::jsonb,
   NOW() - INTERVAL '8 days'),
  -- Streak badge
  (gen_random_uuid(), '3968ba5e-605e-437e-a040-849f34e1909d', 'streak', 'On a Roll',
   '{"description": "Completed 3 consecutive projects with 4+ star ratings"}'::jsonb,
   NOW() - INTERVAL '5 days'),
  -- Cross-institution badge (worked with Crusader Ventures from different org)
  (gen_random_uuid(), '3968ba5e-605e-437e-a040-849f34e1909d', 'cross_institution', 'Network Contributor',
   '{"description": "Completed a project with a partner from outside your institution"}'::jsonb,
   NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 5. UPGRADE SKILL VERIFICATION (mark some as project-verified)
-- =====================================================================

-- Mark Financial Modeling as project-verified (from completed financial model projects)
UPDATE user_skills
SET verification_source = 'project_completion',
    verified_at = NOW() - INTERVAL '20 days',
    evidence_notes = 'Verified through delivery of Financial Model for Alumni Venture Fund (5-star rating)'
WHERE user_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND skill_id = (SELECT id FROM skills WHERE name = 'Financial Modeling' LIMIT 1);

-- Mark Leadership as project-verified (from Leadership Workshop)
UPDATE user_skills
SET verification_source = 'project_completion',
    verified_at = NOW() - INTERVAL '22 days',
    evidence_notes = 'Verified through design and delivery of Leadership Workshop Curriculum (5-star rating)'
WHERE user_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND skill_id = (SELECT id FROM skills WHERE name = 'Leadership' LIMIT 1);

-- Mark Market Research as project-verified (from Market Analysis)
UPDATE user_skills
SET verification_source = 'project_completion',
    verified_at = NOW() - INTERVAL '8 days',
    evidence_notes = 'Verified through Patriot League NIL Landscape Market Analysis (5-star rating)'
WHERE user_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND skill_id = (SELECT id FROM skills WHERE name = 'Market Research' LIMIT 1);

-- Mark Communication as employer-endorsed
UPDATE user_skills
SET verification_source = 'employer_endorsement',
    verified_at = NOW() - INTERVAL '15 days',
    evidence_notes = 'Endorsed by Mark Johnson (Johnson Consulting): "Polished presentation and communication skills"'
WHERE user_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND skill_id = (SELECT id FROM skills WHERE name = 'Communication' LIMIT 1);

-- Mark Strategic Thinking as project-verified
UPDATE user_skills
SET verification_source = 'project_completion',
    verified_at = NOW() - INTERVAL '12 days',
    evidence_notes = 'Verified through B2B SaaS Trends market research for Crusader Ventures (4-star rating)'
WHERE user_id = '3968ba5e-605e-437e-a040-849f34e1909d'
  AND skill_id = (SELECT id FROM skills WHERE name = 'Strategic Thinking' LIMIT 1);

-- =====================================================================
-- 6. UPDATE PORTFOLIO BIO AND HEADLINE
-- =====================================================================

UPDATE student_portfolios
SET headline = 'Finance & Leadership | Quarterback | 4x Completed Projects',
    bio = 'Starting quarterback at the College of the Holy Cross with a 3.7 GPA in Business Analytics. I''ve completed four verified consulting projects through Proveground — from building investor-grade financial models for alumni venture funds to designing leadership curricula adopted by Fortune 500 training programs. My competitive edge comes from translating the preparation, decision-making, and composure required at quarterback into every professional engagement. Three corporate partners have endorsed my work with a combined 4.75-star average rating.',
    view_count = 127,
    updated_at = NOW()
WHERE slug = 'marcus-williams';

-- Also update the user-level bio
UPDATE users
SET bio = 'Starting quarterback at the College of the Holy Cross, Class of 2026. Business Analytics major with a 3.7 GPA. Four verified consulting projects completed through Proveground with a 4.75-star average. I bring the same preparation and discipline from the field to every project I take on.'
WHERE email = 'marcus.williams@holycross.edu';

-- Update metadata with richer profile data
UPDATE users
SET metadata = jsonb_build_object(
  'sportsPlayed', 'Football',
  'position', 'Quarterback',
  'activities', 'Finance Club President, Student-Athlete Advisory Committee, Patriot League Scholar-Athlete'
)
WHERE email = 'marcus.williams@holycross.edu';
