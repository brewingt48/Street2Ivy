-- Migration 007: ProveGround Match Engine™ — Seed Data
--
-- Seeds:
--   1. 18 sport seasons (NCAA D1 typical schedules)
--   2. ~100 athletic skill mappings (sport/position → professional skills)
--   3. Academic calendar template (for tenants to clone)

-- ============================================================================
-- 1. SPORT SEASONS — NCAA D1 typical schedules
-- ============================================================================

-- Football
INSERT INTO sport_seasons (sport_name, season_type, start_month, end_month, practice_hours_per_week, competition_hours_per_week, travel_days_per_month, intensity_level, division, notes)
VALUES
    ('Football', 'preseason', 7, 8, 25, 0, 0, 5, 'D1', 'Fall camp / two-a-days'),
    ('Football', 'regular', 9, 11, 20, 8, 4, 5, 'D1', 'Regular season — Saturdays'),
    ('Football', 'postseason', 12, 1, 20, 8, 6, 5, 'D1', 'Bowl season / playoffs'),
    ('Football', 'offseason', 2, 6, 8, 0, 0, 2, 'D1', 'Spring ball + conditioning'),

-- Men''s Basketball
    ('Basketball (M)', 'preseason', 9, 10, 20, 0, 0, 4, 'D1', 'Preseason practice'),
    ('Basketball (M)', 'regular', 11, 3, 20, 6, 6, 5, 'D1', 'Conference + non-conference'),
    ('Basketball (M)', 'postseason', 3, 4, 20, 8, 8, 5, 'D1', 'March Madness'),
    ('Basketball (M)', 'offseason', 5, 8, 6, 0, 0, 2, 'D1', 'Summer workouts'),

-- Women''s Basketball
    ('Basketball (W)', 'preseason', 9, 10, 20, 0, 0, 4, 'D1', 'Preseason practice'),
    ('Basketball (W)', 'regular', 11, 3, 20, 6, 6, 5, 'D1', 'Conference + non-conference'),
    ('Basketball (W)', 'postseason', 3, 4, 20, 8, 8, 5, 'D1', 'NCAA Tournament'),
    ('Basketball (W)', 'offseason', 5, 8, 6, 0, 0, 2, 'D1', 'Summer workouts'),

-- Men''s Soccer
    ('Soccer (M)', 'preseason', 8, 8, 22, 0, 0, 4, 'D1', 'Preseason camp'),
    ('Soccer (M)', 'regular', 9, 11, 18, 6, 4, 4, 'D1', 'Fall season'),
    ('Soccer (M)', 'offseason', 12, 7, 6, 0, 0, 2, 'D1', 'Spring + summer training'),

-- Women''s Soccer
    ('Soccer (W)', 'preseason', 8, 8, 22, 0, 0, 4, 'D1', 'Preseason camp'),
    ('Soccer (W)', 'regular', 9, 11, 18, 6, 4, 4, 'D1', 'Fall season'),
    ('Soccer (W)', 'offseason', 12, 7, 6, 0, 0, 2, 'D1', 'Spring + summer training'),

-- Baseball
    ('Baseball', 'preseason', 1, 2, 18, 0, 0, 3, 'D1', 'Preseason workouts + scrimmages'),
    ('Baseball', 'regular', 2, 6, 20, 8, 6, 4, 'D1', 'Spring season — mid-week + weekends'),
    ('Baseball', 'offseason', 7, 12, 6, 0, 0, 2, 'D1', 'Fall ball + conditioning'),

-- Softball
    ('Softball', 'preseason', 1, 2, 18, 0, 0, 3, 'D1', 'Preseason workouts'),
    ('Softball', 'regular', 2, 5, 20, 8, 6, 4, 'D1', 'Spring season'),
    ('Softball', 'offseason', 6, 12, 6, 0, 0, 2, 'D1', 'Fall practice + conditioning'),

-- Volleyball (Women''s — fall sport)
    ('Volleyball', 'preseason', 8, 8, 22, 0, 0, 4, 'D1', 'Preseason camp'),
    ('Volleyball', 'regular', 9, 12, 18, 6, 4, 4, 'D1', 'Fall season'),
    ('Volleyball', 'offseason', 1, 7, 6, 0, 0, 2, 'D1', 'Spring + summer training'),

-- Tennis
    ('Tennis', 'regular', 1, 5, 16, 4, 4, 3, 'D1', 'Spring dual match season'),
    ('Tennis', 'offseason', 6, 12, 8, 2, 1, 2, 'D1', 'Fall tournaments + training'),

-- Swimming & Diving
    ('Swimming', 'regular', 10, 3, 20, 4, 4, 4, 'D1', 'Dual meets + invitational season'),
    ('Swimming', 'championship', 3, 3, 22, 6, 6, 5, 'D1', 'Conference + NCAA Championships'),
    ('Swimming', 'offseason', 4, 9, 10, 0, 0, 2, 'D1', 'Summer training'),

-- Track & Field
    ('Track & Field', 'indoor', 12, 3, 18, 4, 4, 4, 'D1', 'Indoor season'),
    ('Track & Field', 'outdoor', 3, 6, 18, 4, 4, 4, 'D1', 'Outdoor season'),
    ('Track & Field', 'offseason', 7, 11, 10, 0, 0, 2, 'D1', 'Cross-training + base building'),

-- Lacrosse (M)
    ('Lacrosse (M)', 'regular', 2, 5, 18, 6, 4, 4, 'D1', 'Spring season'),
    ('Lacrosse (M)', 'offseason', 6, 1, 8, 0, 0, 2, 'D1', 'Fall ball + conditioning'),

-- Lacrosse (W)
    ('Lacrosse (W)', 'regular', 2, 5, 18, 6, 4, 4, 'D1', 'Spring season'),
    ('Lacrosse (W)', 'offseason', 6, 1, 8, 0, 0, 2, 'D1', 'Fall ball + conditioning'),

-- Field Hockey
    ('Field Hockey', 'regular', 9, 11, 18, 6, 4, 4, 'D1', 'Fall season'),
    ('Field Hockey', 'offseason', 12, 8, 6, 0, 0, 2, 'D1', 'Spring + summer training'),

-- Ice Hockey
    ('Ice Hockey', 'regular', 10, 3, 20, 6, 6, 4, 'D1', 'Winter season'),
    ('Ice Hockey', 'offseason', 4, 9, 8, 0, 0, 2, 'D1', 'Spring + summer training'),

-- Wrestling
    ('Wrestling', 'regular', 11, 3, 20, 6, 6, 5, 'D1', 'Winter season — dual meets + tournaments'),
    ('Wrestling', 'offseason', 4, 10, 10, 0, 0, 2, 'D1', 'Freestyle/Greco + conditioning'),

-- Golf
    ('Golf', 'fall', 9, 11, 12, 4, 4, 2, 'D1', 'Fall tournament season'),
    ('Golf', 'spring', 2, 5, 14, 4, 6, 3, 'D1', 'Spring championship season'),
    ('Golf', 'offseason', 6, 8, 6, 0, 0, 1, 'D1', 'Summer practice'),

-- Rowing
    ('Rowing', 'fall', 9, 11, 20, 4, 2, 4, 'D1', 'Fall head race season'),
    ('Rowing', 'spring', 3, 5, 22, 6, 4, 5, 'D1', 'Spring sprint season — championship'),
    ('Rowing', 'offseason', 12, 2, 14, 0, 0, 2, 'D1', 'Winter erg + training')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 2. ATHLETIC SKILL MAPPINGS — sport/position → professional skills
-- ============================================================================

-- FOOTBALL
INSERT INTO athletic_skill_mappings (sport_name, position, professional_skill, transfer_strength, skill_category, description) VALUES
    -- Quarterback
    ('Football', 'Quarterback', 'Leadership', 0.95, 'Leadership', 'Leading a team under pressure, making real-time decisions'),
    ('Football', 'Quarterback', 'Decision Making', 0.90, 'Leadership', 'Reading complex situations and choosing the right action quickly'),
    ('Football', 'Quarterback', 'Communication', 0.90, 'Communication', 'Clear, concise direction to teammates in high-pressure situations'),
    ('Football', 'Quarterback', 'Strategic Thinking', 0.85, 'Strategy', 'Pre-snap reads, audibles, game plan execution'),
    ('Football', 'Quarterback', 'Crisis Management', 0.80, 'Leadership', 'Adapting when the plan breaks down'),
    -- Linebacker / Safety (Defensive leaders)
    ('Football', 'Defensive Leader', 'Analytical Thinking', 0.85, 'Strategy', 'Pattern recognition, pre-snap reads, adjustments'),
    ('Football', 'Defensive Leader', 'Team Coordination', 0.80, 'Leadership', 'Aligning defensive scheme in real-time'),
    ('Football', 'Defensive Leader', 'Attention to Detail', 0.80, 'Operations', 'Film study, opponent tendencies, assignment discipline'),
    -- Offensive Line
    ('Football', 'Offensive Line', 'Teamwork', 0.90, 'Leadership', 'Unit cohesion — five players executing as one'),
    ('Football', 'Offensive Line', 'Reliability', 0.85, 'Operations', 'Consistent execution on every play'),
    ('Football', 'Offensive Line', 'Process Discipline', 0.80, 'Operations', 'Technique mastery through repetition'),
    -- Wide Receiver / Running Back
    ('Football', 'Skill Position', 'Adaptability', 0.85, 'Strategy', 'Route adjustments, reading coverage, improvisation'),
    ('Football', 'Skill Position', 'Time Management', 0.75, 'Operations', 'Clock awareness, route timing, situational awareness'),
    -- All football players
    ('Football', NULL, 'Resilience', 0.90, 'Leadership', 'Physical and mental toughness through adversity'),
    ('Football', NULL, 'Work Ethic', 0.85, 'Operations', 'Year-round commitment to preparation'),
    ('Football', NULL, 'Accountability', 0.85, 'Leadership', 'Film review, owning mistakes, team-first mindset'),

-- BASKETBALL
    -- Point Guard
    ('Basketball (M)', 'Point Guard', 'Leadership', 0.90, 'Leadership', 'Floor general — setting tempo and directing the offense'),
    ('Basketball (M)', 'Point Guard', 'Strategic Thinking', 0.85, 'Strategy', 'Play calling, reading defenses, exploitation of mismatches'),
    ('Basketball (M)', 'Point Guard', 'Decision Making', 0.90, 'Leadership', 'Split-second choices under defensive pressure'),
    ('Basketball (M)', 'Point Guard', 'Communication', 0.85, 'Communication', 'Constant vocal direction on both ends'),
    -- Forward / Center
    ('Basketball (M)', 'Forward/Center', 'Spatial Awareness', 0.80, 'Strategy', 'Positioning, angles, rebounding anticipation'),
    ('Basketball (M)', 'Forward/Center', 'Collaboration', 0.80, 'Leadership', 'Pick-and-roll chemistry, defensive rotations'),
    -- All basketball
    ('Basketball (M)', NULL, 'Composure Under Pressure', 0.90, 'Leadership', 'Free throws, late-game execution, hostile environments'),
    ('Basketball (M)', NULL, 'Adaptability', 0.85, 'Strategy', 'Adjusting to opponent tactics mid-game'),
    ('Basketball (M)', NULL, 'Competitive Drive', 0.90, 'Leadership', 'Relentless pursuit of excellence'),

-- Women''s Basketball (similar transfers)
    ('Basketball (W)', 'Point Guard', 'Leadership', 0.90, 'Leadership', 'Floor general — setting tempo and directing the offense'),
    ('Basketball (W)', 'Point Guard', 'Strategic Thinking', 0.85, 'Strategy', 'Play calling, reading defenses'),
    ('Basketball (W)', 'Point Guard', 'Decision Making', 0.90, 'Leadership', 'Split-second choices under pressure'),
    ('Basketball (W)', NULL, 'Composure Under Pressure', 0.90, 'Leadership', 'Clutch performance in high-stakes moments'),
    ('Basketball (W)', NULL, 'Teamwork', 0.85, 'Leadership', 'Collaborative play, unselfish basketball'),

-- SOCCER
    ('Soccer (M)', 'Midfielder', 'Versatility', 0.85, 'Strategy', 'Transition between offense and defense, box-to-box play'),
    ('Soccer (M)', 'Midfielder', 'Endurance', 0.80, 'Operations', 'Sustained performance over 90 minutes'),
    ('Soccer (M)', 'Goalkeeper', 'Risk Assessment', 0.85, 'Strategy', 'Reading plays, coming off the line, distribution decisions'),
    ('Soccer (M)', 'Captain', 'Leadership', 0.90, 'Leadership', 'On-field organization, motivating teammates'),
    ('Soccer (M)', NULL, 'Adaptability', 0.80, 'Strategy', 'Tactical flexibility, formation changes'),
    ('Soccer (M)', NULL, 'Spatial Awareness', 0.80, 'Strategy', 'Positioning, vision, passing lanes'),

    ('Soccer (W)', 'Midfielder', 'Versatility', 0.85, 'Strategy', 'Transition play, two-way contribution'),
    ('Soccer (W)', NULL, 'Teamwork', 0.85, 'Leadership', 'Combination play, collective defending'),
    ('Soccer (W)', NULL, 'Communication', 0.80, 'Communication', 'Constant verbal and nonverbal cues on the field'),

-- BASEBALL / SOFTBALL
    ('Baseball', 'Pitcher', 'Composure Under Pressure', 0.90, 'Leadership', 'Performing in high-leverage situations'),
    ('Baseball', 'Pitcher', 'Preparation', 0.85, 'Operations', 'Scouting reports, pitch sequences, game planning'),
    ('Baseball', 'Catcher', 'Leadership', 0.85, 'Leadership', 'Calling the game, managing the pitching staff'),
    ('Baseball', 'Catcher', 'Communication', 0.85, 'Communication', 'Real-time strategy communication with pitcher'),
    ('Baseball', NULL, 'Patience', 0.75, 'Operations', 'Plate discipline, long season mental stamina'),
    ('Baseball', NULL, 'Attention to Detail', 0.80, 'Operations', 'Situational baseball, defensive positioning'),

    ('Softball', 'Pitcher', 'Composure Under Pressure', 0.90, 'Leadership', 'Performing in high-leverage situations'),
    ('Softball', 'Catcher', 'Leadership', 0.85, 'Leadership', 'Calling the game, managing the pitching staff'),
    ('Softball', NULL, 'Teamwork', 0.80, 'Leadership', 'Small-ball strategy, execution as a unit'),

-- VOLLEYBALL
    ('Volleyball', 'Setter', 'Decision Making', 0.85, 'Leadership', 'Every touch is a strategic choice — distribute under pressure'),
    ('Volleyball', 'Setter', 'Communication', 0.85, 'Communication', 'Calling plays, reading blockers, tempo management'),
    ('Volleyball', 'Libero', 'Reliability', 0.85, 'Operations', 'Consistent defensive excellence, serve receive'),
    ('Volleyball', NULL, 'Teamwork', 0.90, 'Leadership', 'Rapid coordination — rally scoring demands seamless execution'),
    ('Volleyball', NULL, 'Composure Under Pressure', 0.85, 'Leadership', 'Every point matters, no clock to run out'),

-- TENNIS
    ('Tennis', NULL, 'Self-Discipline', 0.90, 'Operations', 'Individual accountability — no teammates to lean on'),
    ('Tennis', NULL, 'Mental Toughness', 0.90, 'Leadership', 'Solo competition, managing emotions during long matches'),
    ('Tennis', NULL, 'Strategic Thinking', 0.80, 'Strategy', 'Pattern construction, opponent analysis, shot selection'),
    ('Tennis', NULL, 'Problem Solving', 0.80, 'Strategy', 'Real-time tactical adjustments between points and sets'),

-- SWIMMING
    ('Swimming', NULL, 'Self-Discipline', 0.90, 'Operations', 'Early mornings, monotonous training, marginal gains mentality'),
    ('Swimming', NULL, 'Goal Setting', 0.85, 'Operations', 'Chasing hundredths of seconds — precise performance targets'),
    ('Swimming', NULL, 'Time Management', 0.80, 'Operations', 'Balancing 20+ hours/week of training with academics'),
    ('Swimming', 'Relay', 'Teamwork', 0.80, 'Leadership', 'Relay splits, team scoring, supporting teammates'),

-- TRACK & FIELD
    ('Track & Field', 'Sprints', 'Focus', 0.85, 'Operations', 'Maximum output in minimal time window'),
    ('Track & Field', 'Distance', 'Endurance', 0.85, 'Operations', 'Sustained effort, pacing strategy, mental stamina'),
    ('Track & Field', 'Captain', 'Leadership', 0.80, 'Leadership', 'Unifying a diverse event group'),
    ('Track & Field', NULL, 'Self-Discipline', 0.85, 'Operations', 'Individual training, measurable personal improvement'),
    ('Track & Field', NULL, 'Goal Setting', 0.85, 'Operations', 'Personal bests, qualifying standards, incremental improvement'),

-- LACROSSE
    ('Lacrosse (M)', 'Attack', 'Creativity', 0.80, 'Strategy', 'Finding scoring opportunities, dodging, feeding'),
    ('Lacrosse (M)', 'Midfield', 'Versatility', 0.85, 'Strategy', 'Two-way play, ground balls, transition'),
    ('Lacrosse (M)', 'Goalie', 'Risk Assessment', 0.85, 'Strategy', 'Clearing decisions, shot stopping, directing the defense'),
    ('Lacrosse (M)', NULL, 'Teamwork', 0.80, 'Leadership', 'Ride, clear, settled offense — team-wide coordination'),

    ('Lacrosse (W)', 'Attack', 'Creativity', 0.80, 'Strategy', 'Creating in tight spaces'),
    ('Lacrosse (W)', NULL, 'Communication', 0.80, 'Communication', 'Defensive slides, offensive sets'),
    ('Lacrosse (W)', NULL, 'Adaptability', 0.80, 'Strategy', 'Rule differences, tactical adjustments'),

-- FIELD HOCKEY
    ('Field Hockey', NULL, 'Teamwork', 0.85, 'Leadership', 'Passing combinations, defensive shape'),
    ('Field Hockey', NULL, 'Spatial Awareness', 0.80, 'Strategy', 'Field positioning, angle of approach'),
    ('Field Hockey', NULL, 'Endurance', 0.80, 'Operations', 'Continuous running, high work rate'),

-- ICE HOCKEY
    ('Ice Hockey', 'Center', 'Leadership', 0.85, 'Leadership', 'Face-offs, defensive responsibility, two-way play'),
    ('Ice Hockey', 'Goalie', 'Composure Under Pressure', 0.90, 'Leadership', 'High-pressure saves, consistency over 60 minutes'),
    ('Ice Hockey', NULL, 'Teamwork', 0.85, 'Leadership', 'Line chemistry, shift management, backchecking'),
    ('Ice Hockey', NULL, 'Resilience', 0.85, 'Leadership', 'Physical play, bouncing back from bad shifts'),

-- WRESTLING
    ('Wrestling', NULL, 'Mental Toughness', 0.95, 'Leadership', 'One-on-one combat, weight management, individual accountability'),
    ('Wrestling', NULL, 'Self-Discipline', 0.90, 'Operations', 'Weight cuts, training regimen, lifestyle commitment'),
    ('Wrestling', NULL, 'Problem Solving', 0.85, 'Strategy', 'Chain wrestling, setups, scramble positions'),
    ('Wrestling', NULL, 'Resilience', 0.90, 'Leadership', 'Getting taken down and fighting back up'),

-- GOLF
    ('Golf', NULL, 'Focus', 0.90, 'Operations', '4+ hours of sustained concentration'),
    ('Golf', NULL, 'Self-Discipline', 0.85, 'Operations', 'Practice regimen, course management, emotional control'),
    ('Golf', NULL, 'Strategic Thinking', 0.85, 'Strategy', 'Course management, club selection, risk/reward analysis'),
    ('Golf', NULL, 'Composure Under Pressure', 0.85, 'Leadership', 'Tournament golf — performing under scrutiny'),

-- ROWING
    ('Rowing', NULL, 'Teamwork', 0.95, 'Leadership', 'Perfect synchronization — 8 athletes rowing as one'),
    ('Rowing', NULL, 'Work Ethic', 0.90, 'Operations', 'Predawn training, extreme physical demands'),
    ('Rowing', NULL, 'Endurance', 0.85, 'Operations', '2K erg tests, sustained high-output performance'),
    ('Rowing', NULL, 'Process Discipline', 0.85, 'Operations', 'Stroke rate, technique consistency, race plan execution')

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 3. ACADEMIC CALENDAR TEMPLATE (Holy Cross — tenant f4260dd3-20a2-45fd-a0c5-aea412ec2263)
-- ============================================================================
INSERT INTO academic_calendars (tenant_id, term_name, term_type, start_date, end_date, is_break, priority_level, academic_year, notes)
VALUES
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Fall 2025', 'semester', '2025-08-25', '2025-12-12', FALSE, 4, '2025-2026', 'Fall semester — classes in session'),
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Thanksgiving Break 2025', 'break', '2025-11-24', '2025-11-28', TRUE, 2, '2025-2026', 'Thanksgiving recess'),
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Winter Break 2025-2026', 'break', '2025-12-13', '2026-01-19', TRUE, 1, '2025-2026', 'Winter break — high availability'),
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Spring 2026', 'semester', '2026-01-20', '2026-05-08', FALSE, 4, '2025-2026', 'Spring semester — classes in session'),
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Spring Break 2026', 'break', '2026-03-09', '2026-03-13', TRUE, 2, '2025-2026', 'Spring break'),
    ('f4260dd3-20a2-45fd-a0c5-aea412ec2263', 'Summer 2026', 'summer', '2026-05-09', '2026-08-24', TRUE, 1, '2025-2026', 'Summer — high availability for internships/projects')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done — Seed data loaded
-- ============================================================================
