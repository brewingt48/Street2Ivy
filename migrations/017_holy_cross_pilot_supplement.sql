-- ============================================================
-- Migration 017: Holy Cross Pilot — Supplementary Data
-- ============================================================
-- Adds missing data that the analytics, outcomes, and skills-gap
-- pages require:
--   1. skill_gap_snapshots   — readiness scores, gaps, strengths
--   2. portfolio_views        — views on existing student portfolios
--   3. Cleans stale outcome_metrics so the system recomputes fresh
-- ============================================================
-- Idempotent: uses ON CONFLICT DO NOTHING and conditional deletes.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 0. Resolve the tenant once
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE subdomain = 'holy-cross-pilot';
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'holy-cross-pilot tenant not found — skipping';
    RETURN;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 1. SKILL GAP SNAPSHOTS
  -- ──────────────────────────────────────────────────────────
  -- Create one snapshot per student against a relevant target role.
  -- Scores distributed across all four readiness tiers:
  --   Hire-Ready (76+), Demonstrating (51-75), Building (26-50), Exploring (<26)
  --
  -- Target Roles used:
  --   Business Analyst  = a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd
  --   Financial Analyst  = ca6ffcbd-e402-41f2-acc0-ca69f080001e
  --   Marketing Manager  = e9c305f2-ac4b-4c8a-94b6-2c60c01f04f9
  --   Data Analyst       = 41803d0c-cc04-4c08-bebd-44ec63e4b737

  -- Delete any existing snapshots for these students (idempotent re-run)
  DELETE FROM skill_gap_snapshots
  WHERE student_id IN (
    SELECT id FROM users WHERE tenant_id = v_tenant_id AND role = 'student'
  );

  -- Marcus Williams → Business Analyst, score 78 (Hire-Ready)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd'::uuid,
    78.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"b4958588-7445-4940-addb-2fbcb26c0a74","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'marcus.williams.hcp@holycross.edu';

  -- Gabriela Santos → Business Analyst, score 72 (Demonstrating)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd'::uuid,
    72.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"},
      {"skillId":"fdbbeaf3-6227-4061-8dba-ea76e8486ca1","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'gabriela.santos@holycross.edu';

  -- Priya Sharma → Data Analyst, score 82 (Hire-Ready)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    82.00,
    '[
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'priya.sharma@holycross.edu';

  -- David Chen → Data Analyst, score 80 (Hire-Ready)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    80.00,
    '[
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'david.chen.hcp@holycross.edu';

  -- Zoe Washington → Marketing Manager, score 77 (Hire-Ready)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'e9c305f2-ac4b-4c8a-94b6-2c60c01f04f9'::uuid,
    77.00,
    '[
      {"skillId":"22d1aef4-16cb-4c60-9c23-00e4630db132","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"c1275024-5ad0-4991-be87-4cdd5f84f097","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"26ec7a28-45b3-4b49-be1a-7414299a3016","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":5,"exceedsBy":3},
      {"skillId":"7f94014d-26db-466d-930c-112656e051c6","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"5ee761e7-2df1-4a67-9eb9-864c2213ce52","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'zoe.washington@holycross.edu';

  -- Daniel Morales → Financial Analyst, score 65 (Demonstrating)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'ca6ffcbd-e402-41f2-acc0-ca69f080001e'::uuid,
    65.00,
    '[
      {"skillId":"89569692-0057-4476-9391-6da014dbe432","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"86799dd0-2a3c-4465-8864-e41e2a1c7021","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"87f6680d-deaf-4430-887e-eac12befabc8","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'daniel.morales@holycross.edu';

  -- Megan Sullivan → Marketing Manager, score 58 (Demonstrating)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'e9c305f2-ac4b-4c8a-94b6-2c60c01f04f9'::uuid,
    58.00,
    '[
      {"skillId":"a04db8f5-564c-4c84-8c4a-40258fcd54b4","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"22d1aef4-16cb-4c60-9c23-00e4630db132","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"7f94014d-26db-466d-930c-112656e051c6","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"c1275024-5ad0-4991-be87-4cdd5f84f097","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"26ec7a28-45b3-4b49-be1a-7414299a3016","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":2},
      {"skillId":"b4958588-7445-4940-addb-2fbcb26c0a74","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'megan.sullivan@holycross.edu';

  -- Liam Fitzpatrick → Business Analyst, score 55 (Demonstrating)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd'::uuid,
    55.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"b4958588-7445-4940-addb-2fbcb26c0a74","verifiedLevel":5,"exceedsBy":3},
      {"skillId":"003bbe7b-ba0f-40b4-a46e-0fe50e2473a8","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'liam.fitzpatrick@holycross.edu';

  -- Ryan McCarthy → Marketing Manager, score 48 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'e9c305f2-ac4b-4c8a-94b6-2c60c01f04f9'::uuid,
    48.00,
    '[
      {"skillId":"a04db8f5-564c-4c84-8c4a-40258fcd54b4","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"22d1aef4-16cb-4c60-9c23-00e4630db132","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"7f94014d-26db-466d-930c-112656e051c6","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"028c82c1-5b41-4b08-bae5-3874e5d6a4b7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"c1275024-5ad0-4991-be87-4cdd5f84f097","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"26ec7a28-45b3-4b49-be1a-7414299a3016","verifiedLevel":5,"exceedsBy":2},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'ryan.mccarthy@holycross.edu';

  -- Sofia Reyes → Marketing Manager, score 45 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'e9c305f2-ac4b-4c8a-94b6-2c60c01f04f9'::uuid,
    45.00,
    '[
      {"skillId":"a04db8f5-564c-4c84-8c4a-40258fcd54b4","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"22d1aef4-16cb-4c60-9c23-00e4630db132","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"7f94014d-26db-466d-930c-112656e051c6","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"028c82c1-5b41-4b08-bae5-3874e5d6a4b7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"c1275024-5ad0-4991-be87-4cdd5f84f097","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":5,"exceedsBy":3},
      {"skillId":"26ec7a28-45b3-4b49-be1a-7414299a3016","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"5ee761e7-2df1-4a67-9eb9-864c2213ce52","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'sofia.reyes@holycross.edu';

  -- Chloe Nguyen → Data Analyst, score 42 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    42.00,
    '[
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","verifiedLevel":3,"exceedsBy":0},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'chloe.nguyen@holycross.edu';

  -- Aisha Patel → Data Analyst, score 38 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    38.00,
    '[
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'aisha.patel@holycross.edu';

  -- James O'Brien → Data Analyst, score 30 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    30.00,
    '[
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":3,"exceedsBy":0},
      {"skillId":"3bb345a3-b54f-42aa-a874-2bab19675e24","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'james.obrien@holycross.edu';

  -- Andre Thompson → Business Analyst, score 28 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd'::uuid,
    28.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":4,"exceedsBy":1},
      {"skillId":"003bbe7b-ba0f-40b4-a46e-0fe50e2473a8","verifiedLevel":4,"exceedsBy":2}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'andre.thompson@holycross.edu';

  -- Tyler Jackson → Data Analyst, score 18 (Exploring)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    '41803d0c-cc04-4c08-bebd-44ec63e4b737'::uuid,
    18.00,
    '[
      {"skillId":"c4826175-4e31-4b82-b8d6-0d3af6bd7ce7","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"ef44e6b7-3be8-4d95-bc3a-d8f072c4d04e","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"66e79dcf-9ffa-4ca7-aab9-71917b4e21a8","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","requiredLevel":3,"currentLevel":2,"gapSeverity":"minor"},
      {"skillId":"4b9685d8-15df-4401-85d4-a46421dab5c8","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":1}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'tyler.jackson.hcp@holycross.edu';

  -- Demo Student → Business Analyst, score 35 (Building)
  INSERT INTO skill_gap_snapshots (student_id, target_role_id, overall_readiness_score, gaps, strengths, snapshot_date)
  SELECT u.id,
    'a1f18dc1-bb6d-4a4c-af36-e3f2e064f3dd'::uuid,
    35.00,
    '[
      {"skillId":"d9f227f2-0b4b-4d4a-a38f-6001af22be8a","requiredLevel":3,"currentLevel":0,"gapSeverity":"critical"},
      {"skillId":"14675dc6-1aab-4854-ab3d-83ec7281b3d7","requiredLevel":3,"currentLevel":1,"gapSeverity":"significant"},
      {"skillId":"fdbbeaf3-6227-4061-8dba-ea76e8486ca1","requiredLevel":2,"currentLevel":0,"gapSeverity":"significant"}
    ]'::jsonb,
    '[
      {"skillId":"960b1d85-bfc8-4847-8ffd-4323b2b88afa","verifiedLevel":3,"exceedsBy":0},
      {"skillId":"77cf5519-ee46-4eef-a6cf-184256c959a4","verifiedLevel":3,"exceedsBy":0}
    ]'::jsonb,
    CURRENT_DATE
  FROM users u WHERE u.email = 'demo-student@holycross.edu';

  RAISE NOTICE 'Inserted skill_gap_snapshots for 16 students';


  -- ──────────────────────────────────────────────────────────
  -- 2. PORTFOLIO VIEWS
  -- ──────────────────────────────────────────────────────────
  -- Add realistic view records for the 6 existing student portfolios.
  -- viewer_type: 'employer', 'student', 'anonymous', 'educational_admin'

  -- Delete existing pilot portfolio views (idempotent)
  DELETE FROM portfolio_views
  WHERE portfolio_id IN (
    SELECT sp.id FROM student_portfolios sp
    JOIN users u ON u.id = sp.student_id
    WHERE u.tenant_id = v_tenant_id
  );

  -- Zoe Washington's portfolio (42 views — most viewed)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT 'a134e548-21f8-429e-b3b9-64756f2fab9f'::uuid,
    (ARRAY['employer','employer','employer','student','student','anonymous','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 42) AS g;

  -- Megan Sullivan's portfolio (35 views)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT '73d73325-1d63-4dec-946e-f502957e9173'::uuid,
    (ARRAY['employer','student','anonymous','employer','student','anonymous','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 35) AS g;

  -- Gabriela Santos' portfolio (28 views)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT '61d2c845-25bd-4a9a-b9fc-42ea3268f5e5'::uuid,
    (ARRAY['employer','anonymous','student','employer','anonymous','student','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 28) AS g;

  -- Marcus Williams' portfolio (22 views)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT 'bab5fd61-74b2-45d6-90ad-ddfc7c216784'::uuid,
    (ARRAY['employer','student','anonymous','employer','anonymous','student','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 22) AS g;

  -- Sofia Reyes' portfolio (18 views)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT '02a517ec-36bd-45d2-bbbb-91006e4fcf3a'::uuid,
    (ARRAY['anonymous','student','employer','anonymous','student','employer','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 18) AS g;

  -- Aisha Patel's portfolio (15 views)
  INSERT INTO portfolio_views (portfolio_id, viewer_type, viewed_at)
  SELECT 'e743126c-b36d-4e04-8ad9-c2295babc887'::uuid,
    (ARRAY['anonymous','employer','student','anonymous','employer','student','educational_admin'])[1 + (g % 7)],
    NOW() - (g || ' hours')::interval
  FROM generate_series(1, 15) AS g;

  RAISE NOTICE 'Inserted portfolio_views for 6 student portfolios';


  -- ──────────────────────────────────────────────────────────
  -- 3. CLEAN STALE OUTCOME METRICS
  -- ──────────────────────────────────────────────────────────
  -- Delete all cached outcome_metrics for this tenant so the
  -- system recomputes fresh from real data on next page load.
  DELETE FROM outcome_metrics
  WHERE institution_id = v_tenant_id;

  RAISE NOTICE 'Cleared stale outcome_metrics — will recompute on next access';

END;
$$;

COMMIT;
