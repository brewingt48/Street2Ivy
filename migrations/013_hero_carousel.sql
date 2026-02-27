-- 013_hero_carousel.sql
-- Add hero carousel support to tenant landing pages.
-- Structure: { images: [{ src: string, alt: string }], intervalMs: number }
-- When null, falls back to existing hero_video_url / hero_video_poster_url.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_carousel JSONB DEFAULT NULL;
