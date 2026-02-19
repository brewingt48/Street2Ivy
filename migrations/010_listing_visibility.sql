-- Add visibility column to listings for tenant vs network scoping
ALTER TABLE listings ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'tenant'
    CHECK (visibility IN ('tenant', 'network'));

CREATE INDEX IF NOT EXISTS idx_listings_visibility ON listings(visibility);

-- Backfill: set tenant_id from author's tenant where missing
UPDATE listings SET tenant_id = u.tenant_id
FROM users u WHERE u.id = listings.author_id AND listings.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
