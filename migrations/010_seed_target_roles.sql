-- 010: Seed Target Roles with Skill Requirements
-- Seeds ~20 common career roles into target_roles and maps them to skill
-- requirements in role_skill_requirements, sourced from O*NET data.
-- Idempotent: uses WHERE NOT EXISTS for roles (no unique constraint on title)
-- and ON CONFLICT DO NOTHING for role_skill_requirements (unique on target_role_id, skill_id).

-- ============================================================================
-- 1. Software Engineer
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Software Engineer',
       'Designs, develops, and maintains software applications and systems using programming languages and development frameworks.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Software Engineer' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Python',          'required',  3),
  ('JavaScript',      'required',  3),
  ('Git',             'required',  3),
  ('SQL',             'required',  3),
  ('REST APIs',       'required',  3),
  ('Problem Solving', 'preferred', 2),
  ('Docker',          'preferred', 2),
  ('React',           'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Software Engineer' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Data Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Data Analyst',
       'Collects, processes, and performs statistical analyses on large datasets to help organizations make data-driven decisions.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Data Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('SQL',                  'required',  3),
  ('Data Analysis',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Python',               'required',  3),
  ('Data Visualization',   'required',  3),
  ('Tableau',              'preferred', 2),
  ('Critical Thinking',    'preferred', 2),
  ('Communication',        'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Data Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Management Consultant
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Management Consultant',
       'Advises organizations on strategy, operations, and management practices to improve efficiency and profitability.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Management Consultant' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Business Strategy',    'required',  3),
  ('Consulting',           'required',  3),
  ('Communication',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Presentation Skills',  'required',  3),
  ('Problem Solving',      'preferred', 2),
  ('Market Research',      'preferred', 2),
  ('Leadership',           'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Management Consultant' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Financial Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Financial Analyst',
       'Evaluates financial data, creates forecasting models, and provides investment recommendations to guide business decisions.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Financial Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Financial Modeling',   'required',  3),
  ('Financial Analysis',   'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Accounting',           'required',  3),
  ('Data Analysis',        'required',  3),
  ('SQL',                  'preferred', 2),
  ('Communication',        'preferred', 2),
  ('Critical Thinking',    'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Financial Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Marketing Manager
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Marketing Manager',
       'Plans and executes marketing strategies, campaigns, and brand initiatives to drive growth and customer engagement.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Marketing Manager' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Digital Marketing',       'required',  3),
  ('Market Research',         'required',  3),
  ('Content Writing',         'required',  3),
  ('Google Analytics',        'required',  3),
  ('Social Media Marketing',  'required',  3),
  ('SEO/SEM',                 'preferred', 2),
  ('Leadership',              'preferred', 2),
  ('Communication',           'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Marketing Manager' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Product Manager
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Product Manager',
       'Defines product vision and roadmap, prioritizes features, and coordinates cross-functional teams to deliver user-centered products.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Product Manager' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Product Management',  'required',  3),
  ('Agile/Scrum',         'required',  3),
  ('User Research',       'required',  3),
  ('Communication',       'required',  3),
  ('Data Analysis',       'required',  3),
  ('Leadership',          'preferred', 2),
  ('SQL',                 'preferred', 2),
  ('Presentation Skills', 'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Product Manager' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. UX Designer
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'UX Designer',
       'Researches user needs, designs intuitive interfaces, and creates prototypes to deliver engaging digital experiences.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'UX Designer' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('UI/UX Design',    'required',  3),
  ('Figma',           'required',  3),
  ('User Research',   'required',  3),
  ('Wireframing',     'required',  3),
  ('Communication',   'required',  3),
  ('HTML/CSS',        'preferred', 2),
  ('Problem Solving', 'preferred', 2),
  ('Teamwork',        'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'UX Designer' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Business Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Business Analyst',
       'Bridges business needs and technology solutions by analyzing processes, gathering requirements, and recommending improvements.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Business Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Data Analysis',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('SQL',                  'required',  3),
  ('Communication',        'required',  3),
  ('Business Strategy',    'required',  3),
  ('Agile/Scrum',          'preferred', 2),
  ('Presentation Skills',  'preferred', 2),
  ('Problem Solving',      'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Business Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. Project Manager
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Project Manager',
       'Plans, executes, and closes projects by managing scope, timelines, budgets, and cross-functional team coordination.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Project Manager' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Project Management',   'required',  3),
  ('Agile/Scrum',          'required',  3),
  ('Communication',        'required',  3),
  ('Leadership',           'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Time Management',      'preferred', 2),
  ('Problem Solving',      'preferred', 2),
  ('Negotiation',          'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Project Manager' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. Account Manager
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Account Manager',
       'Manages client relationships, identifies growth opportunities, and ensures customer satisfaction and retention.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Account Manager' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Communication',        'required',  3),
  ('Negotiation',          'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Market Research',      'required',  3),
  ('Presentation Skills',  'required',  3),
  ('Leadership',           'preferred', 2),
  ('Time Management',      'preferred', 2),
  ('Adaptability',         'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Account Manager' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. Sales Associate
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Sales Associate',
       'Generates leads, builds client pipelines, and closes deals to drive revenue growth for the organization.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Sales Associate' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Communication',        'required',  3),
  ('Negotiation',          'required',  3),
  ('Presentation Skills',  'required',  3),
  ('Market Research',      'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Adaptability',         'preferred', 2),
  ('Time Management',      'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Sales Associate' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. Operations Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Operations Analyst',
       'Analyzes business operations, identifies inefficiencies, and recommends process improvements using data-driven insights.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Operations Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Data Analysis',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('SQL',                  'required',  3),
  ('Project Management',   'required',  3),
  ('Problem Solving',      'required',  3),
  ('Communication',        'preferred', 2),
  ('Tableau',              'preferred', 2),
  ('Business Strategy',    'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Operations Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. Research Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Research Analyst',
       'Conducts qualitative and quantitative research, synthesizes findings, and produces reports to inform strategic decisions.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Research Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Data Analysis',        'required',  3),
  ('Market Research',      'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Critical Thinking',    'required',  3),
  ('Communication',        'required',  3),
  ('SQL',                  'preferred', 2),
  ('Data Visualization',   'preferred', 2),
  ('Presentation Skills',  'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Research Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. Content Strategist
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Content Strategist',
       'Develops content plans, manages editorial calendars, and creates compelling content aligned with brand and audience goals.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Content Strategist' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Content Writing',          'required',  3),
  ('SEO/SEM',                  'required',  3),
  ('Social Media Marketing',   'required',  3),
  ('Communication',            'required',  3),
  ('Google Analytics',         'required',  3),
  ('Copywriting',              'preferred', 2),
  ('Digital Marketing',        'preferred', 2),
  ('Critical Thinking',        'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Content Strategist' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. Supply Chain Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Supply Chain Analyst',
       'Optimizes supply chain logistics, analyzes procurement data, and forecasts demand to reduce costs and improve efficiency.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Supply Chain Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Data Analysis',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('SQL',                  'required',  3),
  ('Project Management',   'required',  3),
  ('Problem Solving',      'required',  3),
  ('Communication',        'preferred', 2),
  ('Tableau',              'preferred', 2),
  ('Time Management',      'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Supply Chain Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. HR Coordinator
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'HR Coordinator',
       'Supports human resources operations including recruitment, onboarding, benefits administration, and employee relations.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'HR Coordinator' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Communication',        'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Project Management',   'required',  3),
  ('Time Management',      'required',  3),
  ('Teamwork',             'required',  3),
  ('Leadership',           'preferred', 2),
  ('Negotiation',          'preferred', 2),
  ('Adaptability',         'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'HR Coordinator' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. Graphic Designer
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Graphic Designer',
       'Creates visual concepts and designs for branding, marketing materials, and digital media using design software and creative skills.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Graphic Designer' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Adobe Creative Suite',  'required',  3),
  ('Figma',                 'required',  3),
  ('UI/UX Design',          'required',  3),
  ('Communication',         'required',  3),
  ('Wireframing',           'required',  3),
  ('HTML/CSS',              'preferred', 2),
  ('Teamwork',              'preferred', 2),
  ('Adaptability',          'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Graphic Designer' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 18. Data Scientist
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Data Scientist',
       'Applies statistical methods, machine learning algorithms, and programming to extract insights and build predictive models from data.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Data Scientist' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Python',            'required',  3),
  ('Machine Learning',  'required',  3),
  ('SQL',               'required',  3),
  ('Data Analysis',     'required',  3),
  ('Pandas',            'required',  3),
  ('Scikit-learn',      'preferred', 2),
  ('TensorFlow',        'preferred', 2),
  ('Communication',     'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Data Scientist' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 19. Investment Banking Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Investment Banking Analyst',
       'Performs financial modeling, due diligence, and market analysis to support mergers, acquisitions, and capital raising transactions.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Investment Banking Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Financial Modeling',   'required',  3),
  ('Financial Analysis',   'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Accounting',           'required',  3),
  ('Presentation Skills',  'required',  3),
  ('Communication',        'preferred', 2),
  ('Critical Thinking',    'preferred', 2),
  ('Time Management',      'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Investment Banking Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 20. Compliance Analyst
-- ============================================================================
INSERT INTO target_roles (title, description, institution_id, source)
SELECT 'Compliance Analyst',
       'Monitors regulatory requirements, conducts audits, and ensures organizational policies adhere to legal and industry standards.',
       NULL, 'onet'
WHERE NOT EXISTS (SELECT 1 FROM target_roles WHERE title = 'Compliance Analyst' AND institution_id IS NULL);

INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
SELECT r.id, s.id, v.importance, v.min_prof, 'onet'
FROM target_roles r
CROSS JOIN (VALUES
  ('Financial Analysis',   'required',  3),
  ('Excel/Google Sheets',  'required',  3),
  ('Communication',        'required',  3),
  ('Critical Thinking',    'required',  3),
  ('Data Analysis',        'required',  3),
  ('Accounting',           'preferred', 2),
  ('Problem Solving',      'preferred', 2),
  ('Adaptability',         'preferred', 2)
) AS v(skill_name, importance, min_prof)
JOIN skills s ON s.name = v.skill_name
WHERE r.title = 'Compliance Analyst' AND r.institution_id IS NULL
ON CONFLICT DO NOTHING;
