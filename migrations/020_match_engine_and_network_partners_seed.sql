-- Migration 020: Match Engine + Network Partners Seed for Holy Cross Pilot
-- Seeds the data needed for the match engine to produce scores and for
-- the admin partners page to display connected network partners.
--
-- Covers:
--   A) student_schedules for demo student (temporal signal)
--   B) student_ratings from completed-project corporate partners (trust signal)
--   C) Pre-computed match_scores for demo student × published listings
--   D) corporate_attractiveness_scores for published listings
--   E) Network partners linked to the pilot tenant via tenant_partner_access
-- ---------------------------------------------------------------------------

-- =========================================================================
-- Constants (CTEs not possible for INSERTs, so we use literal IDs)
-- =========================================================================
-- Pilot tenant:  512763c4-6e30-4306-8b00-6a193a3c9ede
-- Demo student:  e97b82ce-9020-45bd-91bf-3527c8041ef9
-- Admin (Amy):   a98dbb2b-0874-4400-91c0-8ab7b558ae03
--
-- Completed project listing IDs (closed):
--   Supply Chain Audit (Hanover):      f6e315d3-4efc-46c6-a3c3-2db6d5e13e6f
--   Annual Report (Catholic Charities): 4dc9a775-dc59-4e3b-85ca-e1c3a1c18e92
--   Alumni Survey (Holy Cross):         70c5abda-5c9b-44fa-8ade-4b0a8c76af64
--
-- Corporate partner author IDs (from those listings):
--   Hanover:              d3b683cf-39bc-4183-8b23-4d229ec6895c
--   Catholic Charities:   b3d00a61-0012-4222-a986-dd3ee7fd40ad
--   Worcester Bus. Jnl:   45b90be4-a984-45d8-aa70-a5f9b363c125
--
-- Published listing IDs for match scores:
--   Feature Article:       79618f53-4628-4791-9443-acaa80f7fcff
--   Claims Process:        0946ad19-f6e9-46ff-9831-0b8ebcd2cfdc
--   Digital Health:        c4f01f4f-cdf9-4b65-b45e-e8c543d2b741
--   Mobile App UX:         309bf026-0797-4f11-bc13-41c8a73f3c26
--   Youth Mentorship:      ba6432ca-faa7-4b62-91e2-b9bde84356e7
--   Economic Impact:       f0c08d5b-b741-45b1-9370-14e1dbc038b6
--   Social Media:          f32f76bc-8185-4e6a-af9e-ea5b7a210e6d
--   Cybersecurity:         34ba1c53-c9f8-4151-87ed-271ce672fca9
--   Legislative Policy:    c5de40f6-36bf-440d-a547-d48d4981450d
--   Q3 Market Research:    4efecb9e-d2e5-4100-be2f-8374846eac01
--   Investment Portfolio:   d2eeac02-9273-4049-b6ea-d78915b07793
--   Patient Dashboard:     44980666-ac8a-4d0b-a689-c771071e553f
--
-- Application IDs (from migration 019):
--   Supply Chain Audit:     d0190001-0001-4000-8000-000000000001
--   Annual Report:          d0190001-0002-4000-8000-000000000001
--   Alumni Survey:          d0190001-0003-4000-8000-000000000001

-- =========================================================================
-- A) Student Schedules — Temporal Signal
-- =========================================================================
-- Demo student is a Basketball (M) player, currently in spring off-season.
-- We add a sport schedule linked to Basketball (M) regular season, plus
-- an academic schedule linked to Spring 2026 term.

-- Sport schedule: Basketball (M) regular season (Nov–Mar)
INSERT INTO student_schedules (
  id, user_id, sport_season_id, academic_calendar_id,
  schedule_type, custom_blocks, available_hours_per_week,
  travel_conflicts, is_active, effective_start, effective_end, notes
) VALUES (
  'd0200001-0001-4000-8000-000000000001',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  '157276c9-25b1-44a0-856e-685bab66d482',  -- Basketball (M) regular season
  NULL,
  'sport',
  '[{"day":"monday","start":"14:00","end":"17:00","label":"Practice"},{"day":"wednesday","start":"14:00","end":"17:00","label":"Practice"},{"day":"friday","start":"14:00","end":"16:00","label":"Shootaround"}]'::jsonb,
  12,
  '[{"date":"2026-02-07","reason":"Away game @ Bucknell"},{"date":"2026-02-21","reason":"Away game @ Lafayette"},{"date":"2026-03-04","reason":"Patriot League Tournament"}]'::jsonb,
  true,
  '2025-11-01',
  '2026-03-31',
  'In-season schedule — limited project availability'
) ON CONFLICT (id) DO NOTHING;

-- Academic schedule: Spring 2026 term
INSERT INTO student_schedules (
  id, user_id, sport_season_id, academic_calendar_id,
  schedule_type, custom_blocks, available_hours_per_week,
  travel_conflicts, is_active, effective_start, effective_end, notes
) VALUES (
  'd0200001-0002-4000-8000-000000000001',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  NULL,
  '2fd9a33b-9edb-46d3-babd-a25b817f1798',  -- Spring 2026
  'academic',
  '[{"day":"tuesday","start":"09:00","end":"12:00","label":"Classes"},{"day":"thursday","start":"09:00","end":"12:00","label":"Classes"},{"day":"monday","start":"09:00","end":"11:00","label":"Econ Seminar"}]'::jsonb,
  15,
  '[]'::jsonb,
  true,
  '2026-01-15',
  '2026-05-08',
  'Spring 2026 — 15 credits, afternoons mostly free for projects'
) ON CONFLICT (id) DO NOTHING;

-- Off-season schedule: Basketball (M) off-season (May–Aug)
INSERT INTO student_schedules (
  id, user_id, sport_season_id, academic_calendar_id,
  schedule_type, custom_blocks, available_hours_per_week,
  travel_conflicts, is_active, effective_start, effective_end, notes
) VALUES (
  'd0200001-0003-4000-8000-000000000001',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  '7b3d6db0-d258-4eee-8b0c-881774ba3145',  -- Basketball (M) off-season
  NULL,
  'sport',
  '[{"day":"tuesday","start":"06:00","end":"08:00","label":"Voluntary Workouts"},{"day":"thursday","start":"06:00","end":"08:00","label":"Voluntary Workouts"}]'::jsonb,
  30,
  '[]'::jsonb,
  false,
  '2026-05-01',
  '2026-08-31',
  'Off-season — full availability for summer projects'
) ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- B) Student Ratings — Trust Signal
-- =========================================================================
-- Corporate partners who supervised the demo student's completed projects
-- give ratings. These feed the trust/reliability signal.

-- Rating from Hanover Insurance (Supply Chain Audit — completed)
INSERT INTO student_ratings (
  id, application_id, student_id, corporate_id, listing_id,
  project_title, rating, review_text, strengths,
  areas_for_improvement, recommend_for_future
) VALUES (
  'd0200002-0001-4000-8000-000000000001',
  'd0190001-0001-4000-8000-000000000001',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  'd3b683cf-39bc-4183-8b23-4d229ec6895c',
  'f6e315d3-4598-4851-bb29-2831a4fcba18',
  'Supply Chain Audit for Hanover Insurance Group',
  5,
  'Demo Student delivered exceptional work on the supply chain sustainability audit. Their data analysis was thorough and their recommendations were actionable. Completed ahead of schedule with professional-quality deliverables.',
  'Strong analytical thinking, excellent written communication, proactive about asking clarifying questions, reliable meeting attendance',
  'Could benefit from more experience with advanced Excel modeling — but showed quick improvement',
  true
) ON CONFLICT (id) DO NOTHING;

-- Rating from Catholic Charities (Annual Report — completed)
INSERT INTO student_ratings (
  id, application_id, student_id, corporate_id, listing_id,
  project_title, rating, review_text, strengths,
  areas_for_improvement, recommend_for_future
) VALUES (
  'd0200002-0002-4000-8000-000000000001',
  'd0190001-0002-4000-8000-000000000002',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  'b3d00a61-0012-4222-a986-dd3ee7fd40ad',
  '4dc9a775-cab2-4bff-b129-9cec9113d5e1',
  'Annual Report Data Visualization for Catholic Charities',
  4,
  'Solid contributor to our annual report project. Created clear data visualizations that helped tell our impact story. Adapted well to our non-profit context and understood the mission-driven nature of our work.',
  'Creative data visualization, empathetic communication style, strong teamwork with our staff',
  'Time management could improve — a few deliverables came in right at the deadline. Suggest building in more buffer time.',
  true
) ON CONFLICT (id) DO NOTHING;

-- Rating from Holy Cross alumni office (Alumni Survey — completed)
INSERT INTO student_ratings (
  id, application_id, student_id, corporate_id, listing_id,
  project_title, rating, review_text, strengths,
  areas_for_improvement, recommend_for_future
) VALUES (
  'd0200002-0003-4000-8000-000000000001',
  'd0190001-0003-4000-8000-000000000003',
  'e97b82ce-9020-45bd-91bf-3527c8041ef9',
  '45b90be4-a984-45d8-aa70-a5f9b363c125',
  '70c5abda-e263-4037-9325-2d6e47b4816f',
  'Alumni Career Trajectory Survey',
  5,
  'Outstanding work designing and analyzing the alumni career trajectory survey. Demonstrated natural curiosity and genuine interest in understanding alumni outcomes. The final presentation to our team was polished and insightful.',
  'Survey design expertise, statistical analysis, professional presentation skills, self-directed work ethic',
  'No significant areas — one of the strongest student contributors we have worked with',
  true
) ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- C) Pre-computed Match Scores — Demo Student × Published Listings
-- =========================================================================
-- Pre-compute realistic scores so the student dashboard immediately shows
-- matches without waiting for lazy computation. Signal breakdowns reflect
-- the demo student's profile (basketball player, Econ/data skills, 3
-- completed projects, strong ratings).

DELETE FROM match_scores
WHERE student_id = 'e97b82ce-9020-45bd-91bf-3527c8041ef9'
  AND tenant_id = '512763c4-6e30-4306-8b00-6a193a3c9ede';

INSERT INTO match_scores (
  id, student_id, listing_id, tenant_id,
  composite_score, signal_breakdown, is_stale,
  computation_time_ms, version, computed_at
) VALUES
-- Q3 Market Research (MassMutual) — HIGH match: skills + accepted application
('d0200003-0001-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '4efecb9e-d2e5-4100-be2f-8374846eac01',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 87.5,
 '{"temporal":{"score":72,"weight":0.25,"details":{"hoursMatch":0.85,"conflictPenalty":0.12,"academicFit":0.90}},"skills":{"score":92,"weight":0.30,"details":{"directMatches":4,"proficiencyAvg":3.2,"athleticTransfer":0.15,"categoryOverlap":0.85}},"sustainability":{"score":78,"weight":0.15,"details":{"totalHours":28,"burnoutRisk":0.18,"concurrentProjects":1}},"growth":{"score":88,"weight":0.10,"details":{"skillGapPercent":0.22,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.95}}}'::jsonb,
 false, 145, 1, NOW()),

-- Feature Article (WBJ) — HIGH match: writing skills align
('d0200003-0002-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '79618f53-4628-4791-9443-acaa80f7fcff',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 82.3,
 '{"temporal":{"score":68,"weight":0.25,"details":{"hoursMatch":0.80,"conflictPenalty":0.15,"academicFit":0.85}},"skills":{"score":88,"weight":0.30,"details":{"directMatches":3,"proficiencyAvg":3.5,"athleticTransfer":0.10,"categoryOverlap":0.70}},"sustainability":{"score":82,"weight":0.15,"details":{"totalHours":24,"burnoutRisk":0.12,"concurrentProjects":1}},"growth":{"score":85,"weight":0.10,"details":{"skillGapPercent":0.28,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":true,"listingRecency":0.90}}}'::jsonb,
 false, 132, 1, NOW()),

-- Claims Process Optimization (Hanover) — HIGH match: prior relationship
('d0200003-0003-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '0946ad19-f6e9-46ff-9831-0b8ebcd2cfdc',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 80.1,
 '{"temporal":{"score":65,"weight":0.25,"details":{"hoursMatch":0.75,"conflictPenalty":0.18,"academicFit":0.82}},"skills":{"score":85,"weight":0.30,"details":{"directMatches":3,"proficiencyAvg":3.0,"athleticTransfer":0.12,"categoryOverlap":0.78}},"sustainability":{"score":75,"weight":0.15,"details":{"totalHours":30,"burnoutRisk":0.22,"concurrentProjects":1}},"growth":{"score":80,"weight":0.10,"details":{"skillGapPercent":0.30,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":true,"listingRecency":0.88}}}'::jsonb,
 false, 128, 1, NOW()),

-- Economic Impact Analysis (Worcester Chamber) — GOOD match
('d0200003-0004-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'f0c08d5b-b741-45b1-9370-14e1dbc038b6',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 76.8,
 '{"temporal":{"score":62,"weight":0.25,"details":{"hoursMatch":0.72,"conflictPenalty":0.20,"academicFit":0.80}},"skills":{"score":82,"weight":0.30,"details":{"directMatches":3,"proficiencyAvg":2.8,"athleticTransfer":0.08,"categoryOverlap":0.72}},"sustainability":{"score":72,"weight":0.15,"details":{"totalHours":32,"burnoutRisk":0.25,"concurrentProjects":1}},"growth":{"score":82,"weight":0.10,"details":{"skillGapPercent":0.32,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.85}}}'::jsonb,
 false, 118, 1, NOW()),

-- Digital Health Literacy (UMass Memorial) — GOOD match
('d0200003-0005-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'c4f01f4f-cdf9-4b65-b45e-e8c543d2b741',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 74.2,
 '{"temporal":{"score":60,"weight":0.25,"details":{"hoursMatch":0.70,"conflictPenalty":0.22,"academicFit":0.78}},"skills":{"score":78,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.5,"athleticTransfer":0.10,"categoryOverlap":0.65}},"sustainability":{"score":70,"weight":0.15,"details":{"totalHours":28,"burnoutRisk":0.20,"concurrentProjects":1}},"growth":{"score":85,"weight":0.10,"details":{"skillGapPercent":0.38,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.82}}}'::jsonb,
 false, 122, 1, NOW()),

-- Mobile App UX Research (Bioventus) — GOOD match
('d0200003-0006-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '309bf026-0797-4f11-bc13-41c8a73f3c26',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 73.5,
 '{"temporal":{"score":58,"weight":0.25,"details":{"hoursMatch":0.68,"conflictPenalty":0.22,"academicFit":0.76}},"skills":{"score":76,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.8,"athleticTransfer":0.12,"categoryOverlap":0.60}},"sustainability":{"score":74,"weight":0.15,"details":{"totalHours":26,"burnoutRisk":0.18,"concurrentProjects":1}},"growth":{"score":88,"weight":0.10,"details":{"skillGapPercent":0.40,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.80}}}'::jsonb,
 false, 115, 1, NOW()),

-- Youth Mentorship (Catholic Charities) — MODERATE match: prior relationship helps
('d0200003-0007-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'ba6432ca-faa7-4b62-91e2-b9bde84356e7',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 71.0,
 '{"temporal":{"score":55,"weight":0.25,"details":{"hoursMatch":0.65,"conflictPenalty":0.25,"academicFit":0.75}},"skills":{"score":72,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.5,"athleticTransfer":0.15,"categoryOverlap":0.55}},"sustainability":{"score":68,"weight":0.15,"details":{"totalHours":30,"burnoutRisk":0.22,"concurrentProjects":1}},"growth":{"score":82,"weight":0.10,"details":{"skillGapPercent":0.42,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":true,"listingRecency":0.78}}}'::jsonb,
 false, 110, 1, NOW()),

-- Social Media Content Strategy (Worcester Chamber) — MODERATE match
('d0200003-0008-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'f32f76bc-8185-4e6a-af9e-ea5b7a210e6d',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 68.4,
 '{"temporal":{"score":55,"weight":0.25,"details":{"hoursMatch":0.65,"conflictPenalty":0.22,"academicFit":0.74}},"skills":{"score":70,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.5,"athleticTransfer":0.08,"categoryOverlap":0.52}},"sustainability":{"score":65,"weight":0.15,"details":{"totalHours":24,"burnoutRisk":0.15,"concurrentProjects":1}},"growth":{"score":78,"weight":0.10,"details":{"skillGapPercent":0.45,"categoryProgression":false,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.75}}}'::jsonb,
 false, 108, 1, NOW()),

-- Investment Portfolio Risk Report (Fidelity) — MODERATE match
('d0200003-0009-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'd2eeac02-9273-4049-b6ea-d78915b07793',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 66.9,
 '{"temporal":{"score":52,"weight":0.25,"details":{"hoursMatch":0.62,"conflictPenalty":0.25,"academicFit":0.72}},"skills":{"score":68,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.2,"athleticTransfer":0.05,"categoryOverlap":0.55}},"sustainability":{"score":62,"weight":0.15,"details":{"totalHours":35,"burnoutRisk":0.30,"concurrentProjects":1}},"growth":{"score":85,"weight":0.10,"details":{"skillGapPercent":0.48,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.70}}}'::jsonb,
 false, 105, 1, NOW()),

-- Patient Dashboard (UMass Memorial) — MODERATE match
('d0200003-0010-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '44980666-ac8a-4d0b-a689-c771071e553f',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 65.2,
 '{"temporal":{"score":50,"weight":0.25,"details":{"hoursMatch":0.60,"conflictPenalty":0.28,"academicFit":0.70}},"skills":{"score":66,"weight":0.30,"details":{"directMatches":2,"proficiencyAvg":2.5,"athleticTransfer":0.08,"categoryOverlap":0.50}},"sustainability":{"score":60,"weight":0.15,"details":{"totalHours":32,"burnoutRisk":0.28,"concurrentProjects":1}},"growth":{"score":82,"weight":0.10,"details":{"skillGapPercent":0.50,"categoryProgression":true,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.68}}}'::jsonb,
 false, 102, 1, NOW()),

-- Cybersecurity Training (RTX) — LOWER match: different skill domain
('d0200003-0011-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 '34ba1c53-c9f8-4151-87ed-271ce672fca9',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 55.8,
 '{"temporal":{"score":48,"weight":0.25,"details":{"hoursMatch":0.55,"conflictPenalty":0.30,"academicFit":0.68}},"skills":{"score":45,"weight":0.30,"details":{"directMatches":1,"proficiencyAvg":2.0,"athleticTransfer":0.05,"categoryOverlap":0.30}},"sustainability":{"score":65,"weight":0.15,"details":{"totalHours":28,"burnoutRisk":0.20,"concurrentProjects":1}},"growth":{"score":75,"weight":0.10,"details":{"skillGapPercent":0.65,"categoryProgression":false,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.65}}}'::jsonb,
 false, 98, 1, NOW()),

-- Legislative Policy Brief (City of Worcester) — LOWER match
('d0200003-0012-4000-8000-000000000001',
 'e97b82ce-9020-45bd-91bf-3527c8041ef9',
 'c5de40f6-36bf-440d-a547-d48d4981450d',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 52.4,
 '{"temporal":{"score":45,"weight":0.25,"details":{"hoursMatch":0.52,"conflictPenalty":0.32,"academicFit":0.65}},"skills":{"score":42,"weight":0.30,"details":{"directMatches":1,"proficiencyAvg":2.0,"athleticTransfer":0.05,"categoryOverlap":0.28}},"sustainability":{"score":60,"weight":0.15,"details":{"totalHours":30,"burnoutRisk":0.22,"concurrentProjects":1}},"growth":{"score":70,"weight":0.10,"details":{"skillGapPercent":0.68,"categoryProgression":false,"gpaCapacity":0.85}},"trust":{"score":95,"weight":0.10,"details":{"completionRate":1.0,"onTimeRate":0.92,"avgRating":4.67,"tenure":180}},"network":{"score":100,"weight":0.10,"details":{"sameTenant":true,"previousInteraction":false,"listingRecency":0.62}}}'::jsonb,
 false, 95, 1, NOW());


-- =========================================================================
-- D) Corporate Attractiveness Scores — Listing Quality Signals
-- =========================================================================
-- These help rank how attractive each listing is from a student perspective.

DELETE FROM corporate_attractiveness_scores
WHERE tenant_id = '512763c4-6e30-4306-8b00-6a193a3c9ede';

INSERT INTO corporate_attractiveness_scores (
  id, listing_id, author_id, tenant_id,
  attractiveness_score, signal_breakdown, sample_size,
  is_stale, computed_at
) VALUES
('d0200004-0001-4000-8000-000000000001', '4efecb9e-d2e5-4100-be2f-8374846eac01', '464e46be-9b54-4ed3-aed6-19c8f2181559', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 88.0, '{"responsiveness":90,"ratingHistory":85,"completionRate":92,"listingQuality":85}'::jsonb, 12, false, NOW()),
('d0200004-0002-4000-8000-000000000001', '79618f53-4628-4791-9443-acaa80f7fcff', '45b90be4-a984-45d8-aa70-a5f9b363c125', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 82.0, '{"responsiveness":85,"ratingHistory":80,"completionRate":88,"listingQuality":75}'::jsonb, 8, false, NOW()),
('d0200004-0003-4000-8000-000000000001', '0946ad19-f6e9-46ff-9831-0b8ebcd2cfdc', 'd3b683cf-39bc-4183-8b23-4d229ec6895c', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 85.0, '{"responsiveness":88,"ratingHistory":82,"completionRate":90,"listingQuality":80}'::jsonb, 15, false, NOW()),
('d0200004-0004-4000-8000-000000000001', 'c4f01f4f-cdf9-4b65-b45e-e8c543d2b741', '36ee98b7-bdeb-455e-9fb2-6ab2796f7c1f', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 79.0, '{"responsiveness":82,"ratingHistory":78,"completionRate":80,"listingQuality":76}'::jsonb, 10, false, NOW()),
('d0200004-0005-4000-8000-000000000001', '309bf026-0797-4f11-bc13-41c8a73f3c26', 'fc5fedff-f205-43b7-b8df-fd5f76555b04', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 76.0, '{"responsiveness":78,"ratingHistory":75,"completionRate":78,"listingQuality":73}'::jsonb, 6, false, NOW()),
('d0200004-0006-4000-8000-000000000001', 'ba6432ca-faa7-4b62-91e2-b9bde84356e7', 'b3d00a61-0012-4222-a986-dd3ee7fd40ad', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 80.0, '{"responsiveness":84,"ratingHistory":78,"completionRate":82,"listingQuality":76}'::jsonb, 9, false, NOW()),
('d0200004-0007-4000-8000-000000000001', 'f0c08d5b-b741-45b1-9370-14e1dbc038b6', '49c6d6ed-a77e-4e5f-a8b2-94242b9e05f2', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 77.0, '{"responsiveness":80,"ratingHistory":75,"completionRate":78,"listingQuality":75}'::jsonb, 7, false, NOW()),
('d0200004-0008-4000-8000-000000000001', 'f32f76bc-8185-4e6a-af9e-ea5b7a210e6d', '49c6d6ed-a77e-4e5f-a8b2-94242b9e05f2', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 74.0, '{"responsiveness":78,"ratingHistory":72,"completionRate":75,"listingQuality":71}'::jsonb, 5, false, NOW()),
('d0200004-0009-4000-8000-000000000001', '34ba1c53-c9f8-4151-87ed-271ce672fca9', '4f0c5a6f-b882-4857-a62a-23588447c888', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 83.0, '{"responsiveness":86,"ratingHistory":80,"completionRate":85,"listingQuality":81}'::jsonb, 11, false, NOW()),
('d0200004-0010-4000-8000-000000000001', 'c5de40f6-36bf-440d-a547-d48d4981450d', '0a4ca871-3f6a-46c4-b261-d0ec2a9b43b2', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 72.0, '{"responsiveness":75,"ratingHistory":70,"completionRate":74,"listingQuality":69}'::jsonb, 4, false, NOW()),
('d0200004-0011-4000-8000-000000000001', 'd2eeac02-9273-4049-b6ea-d78915b07793', 'f05dfa16-af30-47ec-87c3-7769ea76f042', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 86.0, '{"responsiveness":88,"ratingHistory":84,"completionRate":88,"listingQuality":84}'::jsonb, 14, false, NOW()),
('d0200004-0012-4000-8000-000000000001', '44980666-ac8a-4d0b-a689-c771071e553f', '36ee98b7-bdeb-455e-9fb2-6ab2796f7c1f', '512763c4-6e30-4306-8b00-6a193a3c9ede',
 78.0, '{"responsiveness":80,"ratingHistory":76,"completionRate":80,"listingQuality":76}'::jsonb, 8, false, NOW());


-- =========================================================================
-- E) Network Partners — Linked to Holy Cross Pilot Tenant
-- =========================================================================
-- Link existing global network partners to the pilot tenant AND create
-- 4 new Worcester-area partners specific to the pilot.

-- E1) Link existing network partners to pilot via tenant_partner_access
-- These 8 partners already exist globally; we just connect them to our tenant.

INSERT INTO tenant_partner_access (
  id, tenant_id, network_partner_id, relationship,
  invited_by, accepted_at, featured_in_tenant, is_active
) VALUES
-- Johnson Consulting Group — exclusive partner (alumni-founded)
('d0200005-0001-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'a4e2a01d-afdd-4936-ac67-4839a004d0a7',
 'exclusive',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '30 days',
 true, true),
-- Crusader Ventures — preferred partner
('d0200005-0002-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 '190035f6-87d5-4f22-ae7e-5fcc54f51c18',
 'preferred',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '25 days',
 true, true),
-- CrossFit Analytics — network partner
('d0200005-0003-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 '5d466d75-a5d7-43dd-8e7e-6b6b3cac887a',
 'network',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '20 days',
 false, true),
-- Meridian Capital Group — preferred partner
('d0200005-0004-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'cd9bd747-2ad2-4007-999f-fe13c9f91161',
 'preferred',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '18 days',
 true, true),
-- NorthBridge Consulting — network partner
('d0200005-0005-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 '699e0a59-3020-4104-a7ff-6681a21d7093',
 'network',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '15 days',
 false, true),
-- Bayside Health Systems — preferred partner
('d0200005-0006-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'd3b2c743-4407-4e29-bc59-c62e28e53cfb',
 'preferred',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '12 days',
 false, true),
-- Ironclad Ventures — network partner
('d0200005-0007-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'b921b7f7-a1ab-41c9-af0b-82826130cf58',
 'network',
 NULL,
 NOW() - INTERVAL '10 days',
 false, true),
-- Atlas Media Group — network partner
('d0200005-0008-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 '38551611-9449-4447-837b-b78ef3e87133',
 'network',
 NULL,
 NOW() - INTERVAL '8 days',
 false, true)
ON CONFLICT (id) DO NOTHING;


-- E2) Create new Worcester-area network partners and link them
-- These are new partner organizations specific to the pilot demo.

-- Worcester Community Foundation
INSERT INTO network_partners (
  id, name, slug, type, industry, website, description,
  company_size, headquarters,
  is_alumni_partner, alumni_institution, alumni_sport,
  alumni_graduation_year, alumni_position,
  status, visibility, verified, featured,
  primary_contact_name, primary_contact_email
) VALUES (
  'd0200006-0001-4000-8000-000000000001',
  'Worcester Community Foundation',
  'worcester-community-foundation',
  'corporation',
  'Nonprofit / Philanthropy',
  'https://www.greaterworcester.org',
  'The Greater Worcester Community Foundation connects donors with community needs, funding education, arts, health, and social services across Central Massachusetts. Partners with local colleges for community impact research.',
  '25-50',
  'Worcester, MA',
  false, NULL, NULL, NULL, NULL,
  'active', 'network', true, false,
  'Patricia Sullivan', 'psullivan@greaterworcester.org'
) ON CONFLICT (id) DO NOTHING;

-- Polar Beverages
INSERT INTO network_partners (
  id, name, slug, type, industry, website, description,
  company_size, headquarters,
  is_alumni_partner, alumni_institution, alumni_sport,
  alumni_graduation_year, alumni_position,
  status, visibility, verified, featured,
  primary_contact_name, primary_contact_email
) VALUES (
  'd0200006-0002-4000-8000-000000000001',
  'Polar Beverages',
  'polar-beverages',
  'corporation',
  'Consumer Goods / Manufacturing',
  'https://www.polarbev.com',
  'America''s largest independent sparkling beverage company, headquartered in Worcester since 1882. Offers internships and projects in marketing, supply chain, and sustainability.',
  '500-1000',
  'Worcester, MA',
  true, 'College of the Holy Cross', 'Football',
  2005, 'Sales Director',
  'active', 'network', true, true,
  'Mark Crowley', 'mcrowley@polarbev.com'
) ON CONFLICT (id) DO NOTHING;

-- Reliant Medical Group
INSERT INTO network_partners (
  id, name, slug, type, industry, website, description,
  company_size, headquarters,
  is_alumni_partner, alumni_institution, alumni_sport,
  alumni_graduation_year, alumni_position,
  status, visibility, verified, featured,
  primary_contact_name, primary_contact_email
) VALUES (
  'd0200006-0003-4000-8000-000000000001',
  'Reliant Medical Group',
  'reliant-medical-group',
  'corporation',
  'Healthcare',
  'https://www.reliantmedical.com',
  'A physician-led medical group serving Central Massachusetts with 500+ providers. Collaborates with colleges on health data analytics, patient experience research, and public health initiatives.',
  '1000-5000',
  'Worcester, MA',
  false, NULL, NULL, NULL, NULL,
  'active', 'network', true, false,
  'Dr. Amanda Liu', 'aliu@reliantmedical.com'
) ON CONFLICT (id) DO NOTHING;

-- WPI Venture Forum (cross-campus innovation partner)
INSERT INTO network_partners (
  id, name, slug, type, industry, website, description,
  company_size, headquarters,
  is_alumni_partner, alumni_institution, alumni_sport,
  alumni_graduation_year, alumni_position,
  status, visibility, verified, featured,
  primary_contact_name, primary_contact_email
) VALUES (
  'd0200006-0004-4000-8000-000000000001',
  'Central MA Innovation Alliance',
  'central-ma-innovation',
  'nonprofit',
  'Technology / Innovation',
  'https://www.centralma-innovation.org',
  'A coalition of Worcester-area universities, startups, and established companies fostering innovation and entrepreneurship. Provides project-based learning opportunities connecting students across institutions.',
  '10-25',
  'Worcester, MA',
  true, 'College of the Holy Cross', 'Basketball',
  2012, 'Executive Director',
  'active', 'network', true, true,
  'Brian Maguire', 'bmaguire@centralma-innovation.org'
) ON CONFLICT (id) DO NOTHING;

-- Link new partners to the pilot tenant
INSERT INTO tenant_partner_access (
  id, tenant_id, network_partner_id, relationship,
  invited_by, accepted_at,
  custom_display_name, custom_description,
  featured_in_tenant, is_active
) VALUES
-- Worcester Community Foundation — exclusive partner
('d0200005-0009-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'd0200006-0001-4000-8000-000000000001',
 'exclusive',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '45 days',
 NULL,
 'Long-standing partner of the Donelan Office — supports student-athlete community impact projects.',
 true, true),
-- Polar Beverages — preferred partner (alumni-connected)
('d0200005-0010-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'd0200006-0002-4000-8000-000000000001',
 'preferred',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '35 days',
 NULL,
 'Worcester-based company with HC alumni in leadership. Offers marketing & supply chain projects.',
 true, true),
-- Reliant Medical Group — network partner
('d0200005-0011-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'd0200006-0003-4000-8000-000000000001',
 'network',
 NULL,
 NOW() - INTERVAL '22 days',
 NULL, NULL,
 false, true),
-- Central MA Innovation Alliance — preferred partner (alumni-connected)
('d0200005-0012-4000-8000-000000000001',
 '512763c4-6e30-4306-8b00-6a193a3c9ede',
 'd0200006-0004-4000-8000-000000000001',
 'preferred',
 'a98dbb2b-0874-4400-91c0-8ab7b558ae03',
 NOW() - INTERVAL '40 days',
 NULL,
 'Cross-campus innovation hub led by HC Basketball alum Brian Maguire ''12.',
 true, true)
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- Done! Summary:
-- =========================================================================
-- A) 3 student_schedules for demo student (basketball + academic + off-season)
-- B) 3 student_ratings from corporate partners (avg 4.67/5)
-- C) 12 pre-computed match_scores (range 52-88, realistic distribution)
-- D) 12 corporate_attractiveness_scores for published listings
-- E) 12 tenant_partner_access rows (8 existing + 4 new partners)
--    + 4 new network_partners (Worcester-area organizations)
