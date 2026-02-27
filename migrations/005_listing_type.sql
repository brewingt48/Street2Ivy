-- Migration 005: Add listing_type to listings and network_listings
-- Supports 'project' and 'internship' types with filtering

-- 1. Create the enum type
DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('project', 'internship');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add listing_type column to listings table (corporate partner private listings)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type listing_type NOT NULL DEFAULT 'project';

-- 3. Add listing_type column to network_listings table (network partner listings)
ALTER TABLE network_listings ADD COLUMN IF NOT EXISTS listing_type listing_type NOT NULL DEFAULT 'project';

-- 4. Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_network_listings_listing_type ON network_listings(listing_type);

-- 5. Drop and recreate get_visible_listings() to include listing_type in return type
DROP FUNCTION IF EXISTS get_visible_listings(UUID);
CREATE OR REPLACE FUNCTION get_visible_listings(p_tenant_id UUID)
RETURNS TABLE (
    listing_id UUID,
    source VARCHAR,
    partner_name VARCHAR,
    partner_id UUID,
    relationship VARCHAR,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    listing_type TEXT,
    budget_min NUMERIC,
    budget_max NUMERIC,
    payment_type VARCHAR,
    is_paid BOOLEAN,
    is_alumni_project BOOLEAN,
    alumni_message TEXT,
    listing_status TEXT,
    application_deadline DATE,
    max_students INTEGER,
    students_accepted INTEGER,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant RECORD;
BEGIN
    -- Get tenant info
    SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;

    -- 1. Return tenant-scoped listings (private marketplace)
    RETURN QUERY
    SELECT
        l.id AS listing_id,
        'private'::VARCHAR AS source,
        u.company_name::VARCHAR AS partner_name,
        u.id AS partner_id,
        'exclusive'::VARCHAR AS relationship,
        l.title::VARCHAR,
        l.description,
        l.category::VARCHAR,
        l.listing_type::TEXT AS listing_type,
        l.budget_min,
        l.budget_max,
        l.payment_type::VARCHAR,
        COALESCE(l.is_paid, TRUE) AS is_paid,
        FALSE AS is_alumni_project,
        NULL::TEXT AS alumni_message,
        l.status AS listing_status,
        l.application_deadline,
        COALESCE(l.max_students, 1) AS max_students,
        COALESCE(l.students_accepted, 0) AS students_accepted,
        l.created_at
    FROM listings l
    JOIN users u ON u.id = l.author_id
    WHERE l.tenant_id = p_tenant_id
      AND l.status = 'published';

    -- 2. Return network listings this tenant can see
    IF v_tenant.shared_network_enabled THEN
        RETURN QUERY
        SELECT
            nl.id AS listing_id,
            'network'::VARCHAR AS source,
            np.name::VARCHAR AS partner_name,
            np.id AS partner_id,
            COALESCE(tpa.relationship::VARCHAR, 'network') AS relationship,
            nl.title::VARCHAR,
            nl.description,
            nl.category::VARCHAR,
            nl.listing_type::TEXT AS listing_type,
            nl.budget_min,
            nl.budget_max,
            nl.payment_type::VARCHAR,
            nl.is_paid,
            nl.is_alumni_project,
            nl.alumni_message,
            nl.status::TEXT AS listing_status,
            nl.application_deadline,
            nl.max_students,
            nl.students_accepted,
            nl.created_at
        FROM network_listings nl
        JOIN network_partners np ON np.id = nl.network_partner_id
        LEFT JOIN tenant_partner_access tpa ON tpa.tenant_id = p_tenant_id
            AND tpa.network_partner_id = np.id
            AND tpa.is_active = TRUE
        WHERE nl.status = 'open'
          AND np.status = 'active'
          AND (
              (nl.visibility = 'network')
              OR
              (nl.visibility = 'targeted' AND EXISTS (
                  SELECT 1 FROM network_listing_targets nlt
                  WHERE nlt.network_listing_id = nl.id AND nlt.tenant_id = p_tenant_id
              ))
              OR
              (nl.visibility = 'private' AND tpa.relationship IN ('exclusive', 'preferred'))
          );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
