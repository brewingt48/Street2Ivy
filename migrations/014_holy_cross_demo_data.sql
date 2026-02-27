-- ============================================================================
-- Migration 014: Holy Cross — Full Demo Lifecycle Data
--
-- Seeds project applications, ratings, portfolios, badges, and messages
-- to enable a compelling end-to-end customer demonstration.
--
-- Prerequisites: migrations 005 (holy cross seed) and 008 (match engine)
-- All inserts use ON CONFLICT DO NOTHING for idempotency.
-- ============================================================================


-- ============================================================================
-- 1. Additional Corporate Partner Users
-- ============================================================================
-- Create corporate_partner users for the other two alumni businesses
INSERT INTO users (email, first_name, last_name, role, tenant_id, is_active, password_hash, company_name, job_title)
SELECT
  v.email, v.first_name, v.last_name, 'corporate_partner', t.id, true, 'demo_password_hash',
  v.company, v.title
FROM tenants t
CROSS JOIN (VALUES
  ('david@crusadervc.example.com', 'David', 'Chen', 'Crusader Ventures', 'Partner'),
  ('ryan@crossfitanalytics.example.com', 'Ryan', 'O''Brien', 'CrossFit Analytics', 'CEO')
) AS v(email, first_name, last_name, company, title)
WHERE t.subdomain = 'holy-cross-football'
ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- 2. Set Real Passwords for Key Demo Accounts
-- ============================================================================
-- These allow actual login during customer demos
UPDATE users SET password_hash = crypt('HolyCross2025!', gen_salt('bf', 10))
WHERE email = 'admin@holycross.edu';

UPDATE users SET password_hash = crypt('Demo2025!', gen_salt('bf', 10))
WHERE email IN (
  'marcus.williams@holycross.edu',
  'james.chen@holycross.edu',
  'mark@johnsonconsulting.example.com'
);


-- ============================================================================
-- 3. Project Applications — Full Lifecycle Demo
-- ============================================================================

-- 3a. COMPLETED applications (needed for ratings)

-- James Chen → ML Sports Performance Predictor (completed 2 months ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'James Chen', 'james.chen@holycross.edu', l.title,
  'As a Computer Science major and wide receiver, I bring a unique combination of technical expertise and athletic discipline. I''ve built several ML models in my coursework and am passionate about applying data science to sports analytics. My experience with Python, TensorFlow, and scikit-learn makes me an ideal fit for this project.',
  'This project perfectly aligns my passion for sports with my technical skills. I want to build predictive models that can help coaches and analysts make better decisions.',
  '["Python", "Machine Learning", "Data Analysis", "SQL"]'::jsonb,
  'CS 301 Machine Learning, CS 250 Data Structures, MATH 220 Statistics',
  15, 'Available immediately',
  'student', 'completed',
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 months 25 days',
  NOW() - INTERVAL '2 months 25 days',
  NOW() - INTERVAL '2 months'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Machine Learning Sports Performance Predictor' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'james.chen@holycross.edu'
ON CONFLICT DO NOTHING;

-- Marcus Williams → Financial Model for Alumni Venture Fund (completed 1 month ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Marcus Williams', 'marcus.williams@holycross.edu', l.title,
  'As the starting quarterback, I''ve learned to read complex situations and make decisive calls under pressure. I bring that same analytical mindset to finance. My coursework in financial modeling combined with leadership on and off the field makes me uniquely positioned to deliver a compelling venture fund model.',
  'I want to apply my finance education to a real venture capital context. This project offers the perfect bridge between academic theory and industry practice.',
  '["Financial Modeling", "Excel", "Strategic Thinking", "Communication"]'::jsonb,
  'FIN 301 Corporate Finance, FIN 320 Investment Analysis, ECON 250 Econometrics',
  12, 'Available after spring practice',
  'student', 'completed',
  NOW() - INTERVAL '2 months 15 days',
  NOW() - INTERVAL '2 months 10 days',
  NOW() - INTERVAL '2 months 10 days',
  NOW() - INTERVAL '1 month'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Financial Model for Alumni Venture Fund' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'marcus.williams@holycross.edu'
ON CONFLICT DO NOTHING;

-- Tyler Jackson → Social Media Analytics Dashboard (completed 3 weeks ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at, completed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Tyler Jackson', 'tyler.jackson@holycross.edu', l.title,
  'My Data Science background gives me strong Python and SQL skills, and I''ve built several dashboards using Plotly and Streamlit in my coursework. As a safety, I read patterns on the field the same way I read data — looking for the signal in the noise. I''m excited to build a professional-grade analytics dashboard.',
  'I want hands-on experience building production data products. This project will strengthen my portfolio and give me real client-facing experience.',
  '["Python", "SQL", "Data Analysis", "JavaScript"]'::jsonb,
  'DS 310 Data Visualization, CS 280 Database Systems, STAT 300 Applied Statistics',
  15, 'Available immediately',
  'student', 'completed',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '7 weeks',
  NOW() - INTERVAL '7 weeks',
  NOW() - INTERVAL '3 weeks'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Social Media Analytics Dashboard' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'tyler.jackson@holycross.edu'
ON CONFLICT DO NOTHING;

-- 3b. ACCEPTED applications (in-progress work)

-- Ryan Murphy → Leadership Workshop (accepted 2 weeks ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Ryan Murphy', 'ryan.murphy@holycross.edu', l.title,
  'As an offensive lineman, I understand what it means to lead from the trenches — doing the unglamorous work that makes the team successful. I''ve taken multiple marketing and communications courses and have a genuine passion for developing leadership skills in fellow athletes. I want to create a curriculum that speaks to the unique challenges student-athletes face.',
  'Teaching leadership to fellow athletes is exactly what I want to do after graduation. This project lets me build something meaningful while developing my facilitation skills.',
  '["Leadership", "Communication", "Project Management", "Public Speaking"]'::jsonb,
  'MKT 301 Marketing Strategy, COMM 280 Public Speaking, MGT 350 Organizational Behavior',
  8, 'Available starting next week',
  'student', 'accepted',
  NOW() - INTERVAL '3 weeks',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Leadership Workshop Curriculum Development' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'ryan.murphy@holycross.edu'
ON CONFLICT DO NOTHING;

-- David Okafor → Operations Study (accepted 1 week ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at, responded_at, reviewed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'David Okafor', 'david.okafor@holycross.edu', l.title,
  'As a linebacker, I specialize in reading formations and identifying weak points in opposing strategies. I bring that same analytical mindset to business operations. My Economics coursework in optimization and process design, combined with strong Excel and data analysis skills, make me well-suited for this consulting engagement.',
  'I''m interested in management consulting post-graduation. This hands-on engagement with a real manufacturing client will give me the practical experience I need.',
  '["Data Analysis", "Excel", "Problem Solving", "Project Management"]'::jsonb,
  'ECON 310 Industrial Organization, ECON 280 Operations Research, MATH 250 Linear Algebra',
  12, 'Available immediately',
  'student', 'accepted',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Operations Process Improvement Study' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'david.okafor@holycross.edu'
ON CONFLICT DO NOTHING;

-- 3c. PENDING applications (new interest)

-- Alex Rodriguez → Market Analysis (submitted 3 days ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Alex Rodriguez', 'alex.rodriguez@holycross.edu', l.title,
  'As a running back and Management major, I''ve developed strong communication and adaptability skills. While my background isn''t directly in market research, my leadership experience and ability to quickly learn new domains make me a fast contributor. I''m eager to develop research skills through hands-on work.',
  'I want to expand my skill set into market research and competitive analysis. The NIL landscape is fascinating, and I''d love to contribute to understanding it better.',
  '["Leadership", "Communication", "Adaptability", "Time Management"]'::jsonb,
  'MGT 301 Strategic Management, MGT 280 Organizational Behavior',
  10, 'Available after midterms',
  'student', 'pending',
  NOW() - INTERVAL '3 days'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Market Analysis: Patriot League NIL Landscape' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'alex.rodriguez@holycross.edu'
ON CONFLICT DO NOTHING;

-- Marcus Williams → Market Analysis (submitted 2 days ago)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Marcus Williams', 'marcus.williams@holycross.edu', l.title,
  'Having just completed the Financial Model project, I''m eager to take on another challenge. The NIL landscape is directly relevant to my experience as a Division I quarterback, and my finance background gives me the analytical framework to deliver a thorough competitive analysis.',
  'As a QB in the Patriot League, I have firsthand insight into the NIL landscape. Combined with my finance skills, I can deliver both quantitative analysis and qualitative context that few others can.',
  '["Market Research", "Financial Modeling", "Strategic Thinking", "Communication"]'::jsonb,
  'FIN 301 Corporate Finance, FIN 320 Investment Analysis, MKT 250 Marketing Research',
  10, 'Available immediately',
  'student', 'pending',
  NOW() - INTERVAL '2 days'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Market Analysis: Patriot League NIL Landscape' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'marcus.williams@holycross.edu'
ON CONFLICT DO NOTHING;

-- James Chen → Social Media Dashboard (submitted 1 day ago — second project)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'James Chen', 'james.chen@holycross.edu', l.title,
  'After successfully completing the ML Sports Predictor project, I''m excited to apply for another opportunity. I have strong frontend skills with React and have experience with data visualization libraries like D3.js and Chart.js. I can build an interactive, production-quality dashboard.',
  'I want to expand from ML/backend work into full-stack data products. Building a client-facing analytics dashboard is the perfect next step in my portfolio.',
  '["JavaScript", "React", "Python", "Data Analysis"]'::jsonb,
  'CS 301 Machine Learning, CS 280 Database Systems, CS 250 Web Development',
  15, 'Available immediately',
  'student', 'pending',
  NOW() - INTERVAL '1 day'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Social Media Analytics Dashboard' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'james.chen@holycross.edu'
ON CONFLICT DO NOTHING;

-- 3d. WITHDRAWN application (realistic lifecycle)

-- Alex Rodriguez → Leadership Workshop (withdrew)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  submitted_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Alex Rodriguez', 'alex.rodriguez@holycross.edu', l.title,
  'I''m passionate about leadership development and would love to contribute to building workshop content for fellow athletes.',
  'As a team captain, I have real experience leading student-athletes and want to formalize that into curriculum.',
  '["Leadership", "Communication", "Time Management", "Adaptability"]'::jsonb,
  'MGT 301 Strategic Management, COMM 280 Public Speaking',
  8, 'Available starting next month',
  'student', 'withdrawn',
  NOW() - INTERVAL '4 weeks'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Leadership Workshop Curriculum Development' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'alex.rodriguez@holycross.edu'
ON CONFLICT DO NOTHING;

-- 3e. REJECTED application (realistic lifecycle)

-- Ryan Murphy → ML Predictor (skill mismatch)
INSERT INTO project_applications (
  student_id, listing_id, corporate_id, corporate_name, corporate_email,
  student_name, student_email, listing_title,
  cover_letter, interest_reason, skills, relevant_coursework,
  hours_per_week, availability_date, initiated_by, status,
  rejection_reason,
  submitted_at, responded_at, reviewed_at
)
SELECT
  u.id, l.id, cp.id, 'Johnson Consulting Group', 'mark@johnsonconsulting.example.com',
  'Ryan Murphy', 'ryan.murphy@holycross.edu', l.title,
  'I''m interested in learning machine learning and want to challenge myself with a technical project outside my comfort zone.',
  'I want to develop technical skills to complement my marketing background.',
  '["Project Management", "Communication", "Team Management"]'::jsonb,
  'MKT 301 Marketing Strategy, STAT 200 Intro Statistics',
  15, 'Available immediately',
  'student', 'rejected',
  'We appreciate your enthusiasm, but this project requires strong Python and ML experience. We''d love to work with you on a marketing-focused project — check out the Leadership Workshop listing!',
  NOW() - INTERVAL '6 weeks',
  NOW() - INTERVAL '5 weeks 4 days',
  NOW() - INTERVAL '5 weeks 4 days'
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
JOIN listings l ON l.title = 'Machine Learning Sports Performance Predictor' AND l.tenant_id = t.id
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE u.email = 'ryan.murphy@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. Corporate Ratings (students rate the corporate experience)
-- ============================================================================

-- James Chen rates ML Predictor experience
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Incredible mentorship from Mark and the Johnson Consulting team. They gave me real ownership of the ML pipeline and I learned more in 8 weeks than I did in a semester of coursework. The code reviews were thorough, the feedback was constructive, and they treated me like a real team member. Highly recommend this experience to any CS student.'
FROM project_applications pa
WHERE pa.student_email = 'james.chen@holycross.edu'
  AND pa.listing_title = 'Machine Learning Sports Performance Predictor'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Marcus Williams rates Financial Model experience
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Mark''s guidance was invaluable. He challenged me to think beyond textbook models and consider real-world assumptions that investors actually care about. The venture fund model I built is now part of my portfolio and I''ve already referenced it in job interviews. This was exactly the bridge between classroom theory and industry practice I was looking for.'
FROM project_applications pa
WHERE pa.student_email = 'marcus.williams@holycross.edu'
  AND pa.listing_title = 'Financial Model for Alumni Venture Fund'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Tyler Jackson rates Dashboard experience
INSERT INTO corporate_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  4,
  'Great real-world exposure to building data products for actual clients. The project pushed me to learn frontend visualization libraries I hadn''t used before. The team was supportive and responsive. Only giving 4 stars because I wish there had been more direct client interaction — most communication went through Mark. Overall an excellent experience.'
FROM project_applications pa
WHERE pa.student_email = 'tyler.jackson@holycross.edu'
  AND pa.listing_title = 'Social Media Analytics Dashboard'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5. Student Ratings (corporate partner rates the students)
-- ============================================================================

-- Mark Johnson rates James Chen
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'James delivered an exceptional ML model that exceeded our expectations. His code was clean, well-documented, and production-ready. He proactively suggested improvements to our data pipeline that we hadn''t considered. A true professional despite being a junior.',
  'Exceptional technical skills in Python and ML. Strong self-starter who doesn''t need hand-holding. Excellent documentation habits. Communicates complex technical concepts clearly to non-technical stakeholders.',
  'Could benefit from more experience with production deployment and DevOps practices. Would recommend exploring cloud ML services like AWS SageMaker.',
  true
FROM project_applications pa
WHERE pa.student_email = 'james.chen@holycross.edu'
  AND pa.listing_title = 'Machine Learning Sports Performance Predictor'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Mark Johnson rates Marcus Williams
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  5,
  'Marcus brought a level of professionalism and strategic thinking I rarely see from undergrads. His financial model was investor-grade, and his presentation to our partners was polished and confident. The leadership he brings from the football field clearly translates to professional settings.',
  'Outstanding financial acumen and Excel skills. Natural leader who takes ownership. Polished presentation and communication skills. Strategic thinker who sees the big picture while nailing the details.',
  'Could deepen technical skills in Python for financial modeling — Excel is great, but Python/pandas would give him an edge in quantitative roles.',
  true
FROM project_applications pa
WHERE pa.student_email = 'marcus.williams@holycross.edu'
  AND pa.listing_title = 'Financial Model for Alumni Venture Fund'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Mark Johnson rates Tyler Jackson
INSERT INTO student_ratings (application_id, student_id, corporate_id, listing_id, project_title, rating, review_text, strengths, areas_for_improvement, recommend_for_future)
SELECT
  pa.id, pa.student_id, pa.corporate_id, pa.listing_id, pa.listing_title,
  4,
  'Tyler built a solid analytics dashboard that our clients love. His data skills are strong, and he picked up new visualization libraries quickly. Good work ethic and met all deadlines. He sometimes needed a push to communicate progress proactively, but once we established a regular check-in cadence, things ran smoothly.',
  'Strong data engineering skills in Python and SQL. Quick learner with new technologies. Reliable and meets deadlines consistently. Produces clean, well-structured code.',
  'Could improve proactive communication — tends to go heads-down and forget to update stakeholders. Would benefit from more client-facing experience to develop consultative skills.',
  true
FROM project_applications pa
WHERE pa.student_email = 'tyler.jackson@holycross.edu'
  AND pa.listing_title = 'Social Media Analytics Dashboard'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. Student Portfolios
-- ============================================================================

INSERT INTO student_portfolios (student_id, slug, display_name, headline, bio, theme, is_public, show_readiness_score, show_skill_chart, view_count)
SELECT u.id, v.slug, v.display_name, v.headline, v.bio, 'professional', true, true, true, v.views
FROM users u
JOIN tenants t ON t.subdomain = 'holy-cross-football' AND u.tenant_id = t.id
CROSS JOIN (VALUES
  ('marcus.williams@holycross.edu', 'marcus-williams', 'Marcus Williams',
   'Finance x Football Leadership',
   'Starting quarterback at the College of the Holy Cross with a passion for finance and strategic leadership. I bring the same preparation and decision-making skills from the field to every project I take on. Currently building my portfolio through hands-on consulting projects with HC alumni.',
   47),
  ('james.chen@holycross.edu', 'james-chen', 'James Chen',
   'Full-Stack Developer & Wide Receiver',
   'Computer Science major and wide receiver at Holy Cross. I build things — from React apps to ML models to fourth-quarter comebacks. My completed projects on Proveground demonstrate my ability to deliver production-quality technical work in real business contexts.',
   63),
  ('david.okafor@holycross.edu', 'david-okafor', 'David Okafor',
   'Economics & Analytics',
   'Linebacker and Economics major at Holy Cross. I read defensive formations the same way I read market data — looking for patterns, weaknesses, and opportunities. Currently working on an operations consulting project with Johnson Consulting Group.',
   28),
  ('ryan.murphy@holycross.edu', 'ryan-murphy', 'Ryan Murphy',
   'Marketing & Team Leadership',
   'Offensive lineman and Marketing major who leads from the trenches. I believe the best leaders do the unglamorous work that makes the team successful. Currently developing a leadership curriculum for student-athletes.',
   19),
  ('tyler.jackson@holycross.edu', 'tyler-jackson', 'Tyler Jackson',
   'Data Science & Sports Analytics',
   'Safety and Data Science major at Holy Cross. I read data the same way I read the field — always looking for the signal in the noise. My portfolio features real data products built for actual clients through Proveground.',
   52),
  ('alex.rodriguez@holycross.edu', 'alex-rodriguez', 'Alex Rodriguez',
   'Management & Operations',
   'Running back and Management major at Holy Cross. I bring a running back''s vision and decisiveness to every business challenge. Eager to prove myself through hands-on projects with HC alumni.',
   12)
) AS v(email, slug, display_name, headline, bio, views)
WHERE u.email = v.email
ON CONFLICT (student_id) DO NOTHING;


-- ============================================================================
-- 7. Portfolio Projects (link completed listings)
-- ============================================================================

-- James Chen — ML Sports Predictor
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'This was my first real ML project outside the classroom. I built a gradient boosting model that predicts player performance metrics with 87% accuracy. The most valuable part was learning to work with messy real-world data instead of clean textbook datasets. Mark Johnson was an incredible mentor — his feedback pushed me to write production-quality code.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'james.chen@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-football'
JOIN listings l ON l.title = 'Machine Learning Sports Performance Predictor' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- Marcus Williams — Financial Model
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'Building an investor-grade financial model for a real alumni venture fund was transformative. I went from textbook DCF models to understanding how VCs actually think about risk, return, and portfolio construction. The presentation I delivered to the Crusader Ventures team was a highlight of my college career.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'marcus.williams@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-football'
JOIN listings l ON l.title = 'Financial Model for Alumni Venture Fund' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- Tyler Jackson — Social Media Dashboard
INSERT INTO portfolio_projects (portfolio_id, project_id, display_order, is_featured, student_reflection)
SELECT sp.id, l.id, 1, true,
  'I designed and built an interactive analytics dashboard that tracks social media engagement across multiple platforms. I learned React for the frontend and integrated it with a Python/FastAPI backend. The dashboard is now used by Johnson Consulting''s actual clients — seeing real people use something I built was incredibly rewarding.'
FROM student_portfolios sp
JOIN users u ON u.id = sp.student_id AND u.email = 'tyler.jackson@holycross.edu'
JOIN tenants t ON t.subdomain = 'holy-cross-football'
JOIN listings l ON l.title = 'Social Media Analytics Dashboard' AND l.tenant_id = t.id
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 8. Portfolio Badges
-- ============================================================================

-- James Chen badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first Proveground project"}', (NOW() - INTERVAL '2 months')::text),
  ('five_star', '5-Star Rating', '{"description": "Received a 5-star rating from a corporate partner", "project": "Machine Learning Sports Performance Predictor"}', (NOW() - INTERVAL '7 weeks')::text),
  ('technical_excellence', 'Technical Excellence', '{"description": "Demonstrated exceptional technical skills on a project", "skill_area": "Machine Learning"}', (NOW() - INTERVAL '6 weeks')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'james.chen@holycross.edu'
ON CONFLICT DO NOTHING;

-- Marcus Williams badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first Proveground project"}', (NOW() - INTERVAL '1 month')::text),
  ('five_star', '5-Star Rating', '{"description": "Received a 5-star rating from a corporate partner", "project": "Financial Model for Alumni Venture Fund"}', (NOW() - INTERVAL '3 weeks')::text),
  ('finance_pro', 'Finance Pro', '{"description": "Delivered outstanding financial analysis on a consulting project"}', (NOW() - INTERVAL '3 weeks')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'marcus.williams@holycross.edu'
ON CONFLICT DO NOTHING;

-- Tyler Jackson badges
INSERT INTO portfolio_badges (student_id, badge_type, badge_label, badge_metadata, earned_at)
SELECT u.id, v.badge_type, v.badge_label, v.metadata::jsonb, v.earned::timestamptz
FROM users u
CROSS JOIN (VALUES
  ('first_project', 'First Project Completed', '{"description": "Successfully completed your first Proveground project"}', (NOW() - INTERVAL '3 weeks')::text),
  ('data_expert', 'Data Analytics Expert', '{"description": "Built a production-grade data analytics product", "skill_area": "Data Visualization"}', (NOW() - INTERVAL '2 weeks')::text)
) AS v(badge_type, badge_label, metadata, earned)
WHERE u.email = 'tyler.jackson@holycross.edu'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. Application Messages (sample conversation threads)
-- ============================================================================

-- James Chen ↔ Mark Johnson on ML Predictor
INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, cp.id, 'Mark Johnson', 'corporate',
  'Welcome aboard, James! I''m excited to work with you on this project. I''ve shared access to our historical dataset — you''ll find player performance data from the last 5 Patriot League seasons. Let me know once you''ve had a chance to explore the data and we can discuss your modeling approach.',
  'user', pa.responded_at + INTERVAL '1 hour'
FROM project_applications pa
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE pa.student_email = 'james.chen@holycross.edu'
  AND pa.listing_title = 'Machine Learning Sports Performance Predictor'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, u.id, 'James Chen', 'student',
  'Thanks Mark! I''ve done an initial EDA on the dataset and I''m seeing some interesting patterns. I''m thinking gradient boosting would work well here given the feature interactions. I''ve put together a brief proposal with three modeling approaches — can we schedule a 30-min call this week to discuss?',
  'user', pa.responded_at + INTERVAL '2 days'
FROM project_applications pa
JOIN users u ON u.email = 'james.chen@holycross.edu'
WHERE pa.student_email = 'james.chen@holycross.edu'
  AND pa.listing_title = 'Machine Learning Sports Performance Predictor'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, cp.id, 'Mark Johnson', 'corporate',
  'Great initiative on the EDA, James. Let''s meet Thursday at 3pm. I like the gradient boosting direction — it should handle the categorical features well. Also, if you can include a simple feature importance analysis, that would be really valuable for our clients to understand which metrics matter most.',
  'user', pa.responded_at + INTERVAL '2 days 4 hours'
FROM project_applications pa
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE pa.student_email = 'james.chen@holycross.edu'
  AND pa.listing_title = 'Machine Learning Sports Performance Predictor'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

-- Marcus Williams ↔ Mark Johnson on Financial Model
INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, cp.id, 'Mark Johnson', 'corporate',
  'Marcus, congratulations on being selected! I''m looking forward to working with you. I''ll send over the fund''s term sheet and our initial thesis document. The key deliverable is a 10-year cash flow projection model with IRR sensitivity analysis. Let''s kick off with a call next Monday.',
  'user', pa.responded_at + INTERVAL '2 hours'
FROM project_applications pa
JOIN users cp ON cp.email = 'mark@johnsonconsulting.example.com'
WHERE pa.student_email = 'marcus.williams@holycross.edu'
  AND pa.listing_title = 'Financial Model for Alumni Venture Fund'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO application_messages (application_id, sender_id, sender_name, sender_role, content, message_type, created_at)
SELECT pa.id, u.id, 'Marcus Williams', 'student',
  'Thank you, Mark! I''m honored to be selected. I''ve reviewed similar VC fund models and have a framework in mind. I''ll prepare a draft structure before our Monday call so we can hit the ground running. Looking forward to it — this is exactly the kind of real-world finance experience I''ve been wanting.',
  'user', pa.responded_at + INTERVAL '1 day'
FROM project_applications pa
JOIN users u ON u.email = 'marcus.williams@holycross.edu'
WHERE pa.student_email = 'marcus.williams@holycross.edu'
  AND pa.listing_title = 'Financial Model for Alumni Venture Fund'
  AND pa.status = 'completed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done — Holy Cross now has a complete demo lifecycle
-- ============================================================================
