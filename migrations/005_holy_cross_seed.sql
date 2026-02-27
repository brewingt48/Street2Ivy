-- ============================================================================
-- HOLY CROSS FOOTBALL — Reference Seed Data
-- Uses create_athletic_tenant() from migration 004
-- Creates the tenant, branding, sample alumni partners, and links them
-- ============================================================================

-- Create Holy Cross Football tenant
SELECT create_athletic_tenant(
  'College of the Holy Cross',  -- institution
  'Football',                    -- sport
  'Holy Cross Crusaders',        -- team_name
  'holy-cross-football',         -- slug
  'admin@holycross.edu',         -- admin_email
  'Coach',                       -- admin_first_name
  'Admin',                       -- admin_last_name
  'starter',                     -- plan
  'Patriot League',              -- conference
  NULL,                          -- custom_domain
  'Holy Cross Crusaders Football — Where Players and Alumni Build Futures Together',
  'Real projects. Real mentorship. From the alumni who wore your jersey.',
  NULL                           -- hero_video_url (can be added later)
);

-- Update branding for Holy Cross
UPDATE tenants SET
  branding = '{"primaryColor": "#602D8E", "secondaryColor": "#FFFFFF", "logoUrl": null}'::jsonb,
  social_links = '{"twitter": "https://twitter.com/HCrossFB", "instagram": "https://instagram.com/holycrossfb"}'::jsonb,
  about_content = 'The Holy Cross Crusaders Football program connects current players with our accomplished alumni network. Through Proveground, players gain real-world experience through mentored projects while building relationships with alumni who understand the student-athlete journey.',
  gallery_images = '[]'::jsonb,
  contact_info = '{"email": "athletics@holycross.edu", "phone": "(508) 793-2571"}'::jsonb
WHERE subdomain = 'holy-cross-football';

-- Create sample alumni network partners
INSERT INTO network_partners (name, slug, type, industry, website, description, is_alumni_partner, alumni_institution, alumni_sport, alumni_graduation_year, alumni_position, alumni_years_on_team, status, visibility, primary_contact_name, primary_contact_email, verified, featured)
VALUES
  ('Johnson Consulting Group', 'johnson-consulting', 'alumni_business', 'Management Consulting', 'https://johnsonconsulting.example.com', 'Founded by HC Football alumni. We help mid-market companies optimize operations.', true, 'College of the Holy Cross', 'Football', 2008, 'Linebacker', '4 years', 'active', 'network', 'Mark Johnson', 'mark@johnsonconsulting.example.com', true, true),
  ('Crusader Ventures', 'crusader-ventures', 'alumni_business', 'Venture Capital', 'https://crusadervc.example.com', 'Early-stage tech fund led by HC Football alumni. We invest in the next generation of leaders.', true, 'College of the Holy Cross', 'Football', 2012, 'Wide Receiver', '3 years', 'active', 'network', 'David Chen', 'david@crusadervc.example.com', true, true),
  ('CrossFit Analytics', 'crossfit-analytics', 'alumni_business', 'Data Analytics', 'https://crossfitanalytics.example.com', 'Sports analytics and data consulting from a team that knows the game.', true, 'College of the Holy Cross', 'Football', 2015, 'Quarterback', '4 years', 'active', 'network', 'Ryan O''Brien', 'ryan@crossfitanalytics.example.com', true, false);

-- Link partners to Holy Cross tenant
INSERT INTO tenant_partner_access (tenant_id, network_partner_id, relationship, is_active, featured_in_tenant)
SELECT
  t.id,
  np.id,
  'exclusive',
  true,
  np.featured
FROM tenants t
CROSS JOIN network_partners np
WHERE t.subdomain = 'holy-cross-football'
  AND np.alumni_institution = 'College of the Holy Cross';
